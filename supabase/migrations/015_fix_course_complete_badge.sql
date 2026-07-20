-- Corrige bug latente do badge 'course_complete'.
--
-- Antes: o case `when 'course_complete'` só premiava se `b.course_id is not null`
-- e não tinha branch `else`. Logo, um badge global de "concluiu um curso" (com
-- course_id NULO — o padrão descrito no seed de 011) NUNCA era concedido.
--
-- Agora: badge com course_id set continua exigindo o certificado daquele curso;
-- badge com course_id NULO passa a ser concedido quando o usuário acumula
-- >= trigger_value certificados (cursos concluídos), espelhando o tratamento
-- global que 'lesson_complete' já tinha.
--
-- `set search_path = public, pg_temp` fica na própria definição — create or replace
-- descarta o SET aplicado via ALTER na migration 014, então re-declaramos aqui.

create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  b                   record;
  v_total_xp          integer;
  v_streak            integer;
  v_lessons_done      integer;
  v_course_lessons    integer;
  v_perfect_quizzes   integer;
  v_courses_completed integer;
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

  select count(*)::int into v_courses_completed
  from public.certificates
  where user_id = p_user_id;

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
        if b.course_id is not null then
          -- badge de um curso específico: exige o certificado daquele curso
          if exists (
            select 1 from public.certificates
            where user_id = p_user_id and course_id = b.course_id
          ) then
            insert into public.user_badges (user_id, badge_id)
            values (p_user_id, b.id) on conflict do nothing;
          end if;
        else
          -- badge global: concluiu >= trigger_value cursos (via certificados)
          if v_courses_completed >= b.trigger_value then
            insert into public.user_badges (user_id, badge_id)
            values (p_user_id, b.id) on conflict do nothing;
          end if;
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
