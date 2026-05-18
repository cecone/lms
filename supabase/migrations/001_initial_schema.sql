-- =============================================
-- learn·studio — Schema Inicial v1
-- Idempotente: seguro para re-executar
-- =============================================

create extension if not exists "pgcrypto";

-- =============================================
-- TIPOS ENUM
-- =============================================
do $$ begin
  create type role_type as enum ('aluno', 'professor', 'coordenador', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_status as enum ('draft', 'pending', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trail_type as enum ('linear', 'nonlinear', 'adaptive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type as enum ('video', 'pdf', 'audio', 'scorm', 'h5p', 'quiz');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unlock_type as enum ('sequential', 'free', 'prerequisite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type badge_trigger as enum ('lesson_complete', 'course_complete', 'streak', 'xp_reached', 'quiz_perfect');
exception when duplicate_object then null; end $$;

-- =============================================
-- PROFILES
-- =============================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        role_type not null default 'aluno',
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::role_type, 'aluno')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- COURSES
-- =============================================
create table if not exists public.courses (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  creator_id       uuid not null references public.profiles(id) on delete cascade,
  status           course_status not null default 'draft',
  thumbnail_url    text,
  accent_color     text not null default '#4ADE80',
  trail_type       trail_type not null default 'linear',
  estimated_hours  numeric(4,1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- =============================================
-- MODULES
-- =============================================
create table if not exists public.modules (
  id                      uuid primary key default gen_random_uuid(),
  course_id               uuid not null references public.courses(id) on delete cascade,
  title                   text not null,
  description             text,
  "order"                 integer not null default 0,
  unlock_type             unlock_type not null default 'sequential',
  prerequisite_module_id  uuid references public.modules(id),
  created_at              timestamptz not null default now()
);

-- =============================================
-- LESSONS
-- =============================================
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  title            text not null,
  "order"          integer not null default 0,
  content_type     content_type not null,
  content_url      text,
  duration_seconds integer,
  is_free_preview  boolean not null default false,
  created_at       timestamptz not null default now()
);

-- =============================================
-- ENROLLMENTS
-- =============================================
create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, course_id)
);

-- =============================================
-- PROGRESS
-- =============================================
create table if not exists public.progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  status       lesson_status not null default 'not_started',
  score        numeric(5,2),
  time_spent   integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- =============================================
-- QUIZZES
-- =============================================
create table if not exists public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  questions     jsonb not null default '[]',
  passing_score numeric(5,2) not null default 70,
  max_attempts  integer not null default 3,
  created_at    timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  answers      jsonb not null default '{}',
  score        numeric(5,2) not null,
  passed       boolean not null,
  attempted_at timestamptz not null default now()
);

-- =============================================
-- CERTIFICATES
-- =============================================
create table if not exists public.certificates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  course_id         uuid not null references public.courses(id) on delete cascade,
  verification_code text not null unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  issued_at         timestamptz not null default now(),
  unique(user_id, course_id)
);

-- =============================================
-- BADGES
-- =============================================
create table if not exists public.badges (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid references public.courses(id) on delete cascade,
  name          text not null,
  description   text not null,
  icon_url      text,
  trigger_type  badge_trigger not null,
  trigger_value integer not null default 1,
  created_at    timestamptz not null default now()
);

create table if not exists public.user_badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  badge_id  uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

-- =============================================
-- XP & GAMIFICAÇÃO
-- =============================================
create table if not exists public.user_xp (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade unique,
  total_xp           integer not null default 0,
  level              integer not null default 1,
  streak_days        integer not null default 0,
  last_activity_date date,
  updated_at         timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

-- =============================================
-- INDEXES
-- =============================================
create index if not exists idx_courses_creator    on public.courses(creator_id);
create index if not exists idx_courses_status     on public.courses(status);
create index if not exists idx_modules_course     on public.modules(course_id, "order");
create index if not exists idx_lessons_module     on public.lessons(module_id, "order");
create index if not exists idx_enrollments_user   on public.enrollments(user_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_progress_user      on public.progress(user_id);
create index if not exists idx_progress_lesson    on public.progress(lesson_id);
create index if not exists idx_quiz_attempts      on public.quiz_attempts(user_id, quiz_id);
create index if not exists idx_xp_transactions    on public.xp_transactions(user_id, created_at desc);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.progress        enable row level security;
alter table public.quizzes         enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.certificates    enable row level security;
alter table public.badges          enable row level security;
alter table public.user_badges     enable row level security;
alter table public.user_xp         enable row level security;
alter table public.xp_transactions enable row level security;

-- Helper: retorna o papel (role) do usuário autenticado
-- Nomeado get_user_role para evitar conflito com current_role do PostgreSQL
create or replace function public.get_user_role()
returns role_type language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =============================================
-- RLS POLICIES — removemos e recriamos para idempotência
-- =============================================

-- ---- PROFILES ----
drop policy if exists "Profiles visíveis para todos autenticados" on public.profiles;
create policy "Profiles visíveis para todos autenticados"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Usuário edita próprio perfil" on public.profiles;
create policy "Usuário edita próprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- ---- COURSES ----
drop policy if exists "Cursos publicados visíveis para todos" on public.courses;
create policy "Cursos publicados visíveis para todos"
  on public.courses for select to authenticated
  using (
    status = 'published'
    or creator_id = auth.uid()
    or public.get_user_role() in ('coordenador', 'admin')
  );

drop policy if exists "Professor cria cursos" on public.courses;
create policy "Professor cria cursos"
  on public.courses for insert to authenticated
  with check (public.get_user_role() in ('professor', 'coordenador', 'admin'));

drop policy if exists "Criador edita seu curso" on public.courses;
create policy "Criador edita seu curso"
  on public.courses for update to authenticated
  using (creator_id = auth.uid() or public.get_user_role() in ('coordenador', 'admin'));

-- ---- MODULES ----
drop policy if exists "Módulos visíveis para matriculados e criadores" on public.modules;
create policy "Módulos visíveis para matriculados e criadores"
  on public.modules for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      left join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
      where c.id = modules.course_id
        and (c.creator_id = auth.uid() or e.id is not null or public.get_user_role() in ('coordenador', 'admin'))
    )
  );

drop policy if exists "Criador gerencia módulos" on public.modules;
create policy "Criador gerencia módulos"
  on public.modules for all to authenticated
  using (
    exists (select 1 from public.courses where id = modules.course_id and creator_id = auth.uid())
    or public.get_user_role() in ('coordenador', 'admin')
  );

-- ---- LESSONS ----
drop policy if exists "Aulas visíveis para matriculados" on public.lessons;
create policy "Aulas visíveis para matriculados"
  on public.lessons for select to authenticated
  using (
    is_free_preview = true
    or exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      left join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
      where m.id = lessons.module_id
        and (c.creator_id = auth.uid() or e.id is not null or public.get_user_role() in ('coordenador', 'admin'))
    )
  );

drop policy if exists "Criador gerencia aulas" on public.lessons;
create policy "Criador gerencia aulas"
  on public.lessons for all to authenticated
  using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.creator_id = auth.uid()
    )
    or public.get_user_role() in ('coordenador', 'admin')
  );

-- ---- ENROLLMENTS ----
drop policy if exists "Aluno vê suas matrículas" on public.enrollments;
create policy "Aluno vê suas matrículas"
  on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.get_user_role() in ('professor', 'coordenador', 'admin'));

drop policy if exists "Aluno se matricula" on public.enrollments;
create policy "Aluno se matricula"
  on public.enrollments for insert to authenticated
  with check (user_id = auth.uid());

-- ---- PROGRESS ----
drop policy if exists "Aluno vê e salva seu progresso" on public.progress;
create policy "Aluno vê e salva seu progresso"
  on public.progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Professor vê progresso dos seus alunos" on public.progress;
create policy "Professor vê progresso dos seus alunos"
  on public.progress for select to authenticated
  using (
    exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = progress.lesson_id and c.creator_id = auth.uid()
    )
    or public.get_user_role() in ('coordenador', 'admin')
  );

-- ---- QUIZZES ----
drop policy if exists "Quiz visível para matriculados" on public.quizzes;
create policy "Quiz visível para matriculados"
  on public.quizzes for select to authenticated using (true);

drop policy if exists "Criador gerencia quizzes" on public.quizzes;
create policy "Criador gerencia quizzes"
  on public.quizzes for all to authenticated
  using (public.get_user_role() in ('professor', 'coordenador', 'admin'));

drop policy if exists "Aluno registra tentativas" on public.quiz_attempts;
create policy "Aluno registra tentativas"
  on public.quiz_attempts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- CERTIFICATES ----
drop policy if exists "Certificado visível ao dono e admin" on public.certificates;
create policy "Certificado visível ao dono e admin"
  on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.get_user_role() in ('coordenador', 'admin'));

-- ---- BADGES ----
drop policy if exists "Badges visíveis para todos" on public.badges;
create policy "Badges visíveis para todos"
  on public.badges for select to authenticated using (true);

drop policy if exists "Criador gerencia badges" on public.badges;
create policy "Criador gerencia badges"
  on public.badges for all to authenticated
  using (public.get_user_role() in ('professor', 'coordenador', 'admin'));

drop policy if exists "User badges visíveis ao dono" on public.user_badges;
create policy "User badges visíveis ao dono"
  on public.user_badges for select to authenticated
  using (user_id = auth.uid() or public.get_user_role() in ('coordenador', 'admin'));

-- ---- XP ----
drop policy if exists "XP visível ao dono" on public.user_xp;
create policy "XP visível ao dono"
  on public.user_xp for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Transações XP visíveis ao dono" on public.xp_transactions;
create policy "Transações XP visíveis ao dono"
  on public.xp_transactions for select to authenticated
  using (user_id = auth.uid());

-- =============================================
-- FUNÇÃO: add_xp — adiciona XP e atualiza streak
-- =============================================
create or replace function public.add_xp(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text
)
returns void language plpgsql security definer as $$
declare
  v_today date := current_date;
begin
  insert into public.xp_transactions (user_id, amount, reason)
  values (p_user_id, p_amount, p_reason);

  insert into public.user_xp (user_id, total_xp, level, streak_days, last_activity_date)
  values (p_user_id, p_amount, 1, 1, v_today)
  on conflict (user_id) do update set
    total_xp           = user_xp.total_xp + p_amount,
    level              = floor(log(2, (user_xp.total_xp + p_amount) / 100.0 + 1))::integer + 1,
    streak_days        = case
      when user_xp.last_activity_date = v_today - 1 then user_xp.streak_days + 1
      when user_xp.last_activity_date = v_today     then user_xp.streak_days
      else 1
    end,
    last_activity_date = v_today,
    updated_at         = now();
end;
$$;
