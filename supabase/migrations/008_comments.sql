create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_lesson on public.comments(lesson_id, created_at);

alter table public.comments enable row level security;

-- Qualquer autenticado pode ler
drop policy if exists "Comentários visíveis para autenticados" on public.comments;
create policy "Comentários visíveis para autenticados"
  on public.comments for select to authenticated using (true);

-- Autor insere o próprio comentário
drop policy if exists "Autor cria comentário" on public.comments;
create policy "Autor cria comentário"
  on public.comments for insert to authenticated
  with check (user_id = auth.uid());

-- Autor deleta o próprio comentário; admin/coordenador podem deletar qualquer um
drop policy if exists "Autor ou admin deleta comentário" on public.comments;
create policy "Autor ou admin deleta comentário"
  on public.comments for delete to authenticated
  using (
    user_id = auth.uid()
    or public.get_user_role() in ('coordenador', 'admin')
  );
