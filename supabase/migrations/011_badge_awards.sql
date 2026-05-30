-- ─────────────────────────────────────────────────────────────────────────────
-- check_and_award_badges
-- Verifica todos os badges ainda não conquistados pelo usuário e atribui
-- os que tiveram suas condições atingidas.
-- Chamada automaticamente por add_xp e maybe_issue_certificate.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  b                 record;
  v_total_xp        integer;
  v_streak          integer;
  v_lessons_done    integer;
  v_course_lessons  integer;
  v_perfect_quizzes integer;
begin
  -- Estatísticas atuais do usuário
  select coalesce(total_xp, 0), coalesce(streak_days, 0)
  into v_total_xp, v_streak
  from public.user_xp
  where user_id = p_user_id;

  select count(*)::int into v_lessons_done
  from public.progress
  where user_id = p_user_id and status = 'completed';

  select count(*)::int into v_perfect_quizzes
  from public.quiz_attempts
  where user_id = p_user_id and score = 100;

  -- Percorre badges ainda não conquistados
  for b in
    select * from public.badges
    where id not in (
      select badge_id from public.user_badges where user_id = p_user_id
    )
  loop
    case b.trigger_type

      when 'xp_reached' then
        if v_total_xp >= b.trigger_value then
          insert into public.user_badges (user_id, badge_id)
          values (p_user_id, b.id) on conflict do nothing;
        end if;

      when 'streak' then
        if v_streak >= b.trigger_value then
          insert into public.user_badges (user_id, badge_id)
          values (p_user_id, b.id) on conflict do nothing;
        end if;

      when 'lesson_complete' then
        if b.course_id is not null then
          select count(*)::int into v_course_lessons
          from public.progress pr
          join public.lessons l on l.id = pr.lesson_id
          join public.modules m on m.id = l.module_id
          where pr.user_id = p_user_id
            and pr.status  = 'completed'
            and m.course_id = b.course_id;
          if v_course_lessons >= b.trigger_value then
            insert into public.user_badges (user_id, badge_id)
            values (p_user_id, b.id) on conflict do nothing;
          end if;
        else
          if v_lessons_done >= b.trigger_value then
            insert into public.user_badges (user_id, badge_id)
            values (p_user_id, b.id) on conflict do nothing;
          end if;
        end if;

      when 'course_complete' then
        if b.course_id is not null and exists (
          select 1 from public.certificates
          where user_id = p_user_id and course_id = b.course_id
        ) then
          insert into public.user_badges (user_id, badge_id)
          values (p_user_id, b.id) on conflict do nothing;
        end if;

      when 'quiz_perfect' then
        if v_perfect_quizzes >= b.trigger_value then
          insert into public.user_badges (user_id, badge_id)
          values (p_user_id, b.id) on conflict do nothing;
        end if;

    end case;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recria add_xp chamando check_and_award_badges ao final
-- ─────────────────────────────────────────────────────────────────────────────
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

  perform public.check_and_award_badges(p_user_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recria maybe_issue_certificate chamando check_and_award_badges ao final
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function maybe_issue_certificate(p_user_id uuid, p_lesson_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_course_id         uuid;
  v_total_lessons     int;
  v_completed_lessons int;
begin
  select c.id into v_course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = p_lesson_id;

  if v_course_id is null then return false; end if;

  if exists (
    select 1 from public.certificates
    where user_id = p_user_id and course_id = v_course_id
  ) then return false; end if;

  select count(*)::int into v_total_lessons
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = v_course_id;

  select count(*)::int into v_completed_lessons
  from public.progress pr
  join public.lessons l on l.id  = pr.lesson_id
  join public.modules m on m.id  = l.module_id
  where m.course_id = v_course_id
    and pr.user_id  = p_user_id
    and pr.status   = 'completed';

  if v_completed_lessons < v_total_lessons then return false; end if;

  insert into public.certificates (user_id, course_id)
  values (p_user_id, v_course_id)
  on conflict (user_id, course_id) do nothing;

  update public.enrollments
  set completed_at = now()
  where user_id = p_user_id and course_id = v_course_id and completed_at is null;

  -- Verifica badges de conclusão de curso
  perform public.check_and_award_badges(p_user_id);

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Badges padrão da plataforma (sem course_id = valem para qualquer curso)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.badges (name, description, trigger_type, trigger_value, icon_url) values
  ('Primeira Aula',        'Conclua sua primeira aula',                   'lesson_complete', 1,    null),
  ('Em Ritmo',             'Conclua 5 aulas',                             'lesson_complete', 5,    null),
  ('Dedicado',             'Conclua 20 aulas',                            'lesson_complete', 20,   null),
  ('Maratonista',          'Conclua 50 aulas',                            'lesson_complete', 50,   null),
  ('Sequência de 3 Dias',  'Mantenha um streak de 3 dias consecutivos',   'streak',          3,    null),
  ('Semana Completa',      'Mantenha um streak de 7 dias consecutivos',   'streak',          7,    null),
  ('Mês de Fogo',          'Mantenha um streak de 30 dias consecutivos',  'streak',          30,   null),
  ('Primeiro XP',          'Acumule 100 XP',                              'xp_reached',      100,  null),
  ('Ascendente',           'Acumule 500 XP',                              'xp_reached',      500,  null),
  ('Mestre do XP',         'Acumule 2000 XP',                             'xp_reached',      2000, null),
  ('Quiz Perfeito',        'Tire 100% em um quiz',                        'quiz_perfect',    1,    null),
  ('Gênio dos Quizzes',    'Tire 100% em 5 quizzes',                      'quiz_perfect',    5,    null)
on conflict do nothing;
