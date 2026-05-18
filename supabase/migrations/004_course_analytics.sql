-- Analytics RPC for course creators
-- Returns enrollment totals, per-lesson completion counts, and quiz stats.
-- security definer bypasses RLS so the creator can aggregate across all students.
create or replace function get_course_analytics(p_course_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_creator_id uuid;
  v_role       text;
  v_result     json;
begin
  -- Authorization: only creator, coordenador, or admin
  select creator_id into v_creator_id
  from public.courses
  where id = p_course_id;

  select role into v_role
  from public.profiles
  where id = auth.uid();

  if v_creator_id is null then
    raise exception 'Course not found';
  end if;

  if v_creator_id != auth.uid() and v_role not in ('coordenador', 'admin') then
    raise exception 'Unauthorized';
  end if;

  select json_build_object(
    -- ── Overview ──────────────────────────────────────────
    'total_enrollments',
      (select count(*)::int from public.enrollments where course_id = p_course_id),

    'completed_enrollments',
      (select count(*)::int from public.enrollments
       where course_id = p_course_id and completed_at is not null),

    'total_lessons',
      (select count(*)::int
       from public.lessons l
       join public.modules m on m.id = l.module_id
       where m.course_id = p_course_id),

    'total_completions',
      (select count(*)::int
       from public.progress pr
       join public.lessons l on l.id = pr.lesson_id
       join public.modules m on m.id = l.module_id
       where m.course_id = p_course_id and pr.status = 'completed'),

    -- ── Per-lesson breakdown ──────────────────────────────
    'lessons',
      (select coalesce(json_agg(row order by row."mod_order", row."lesson_order"), '[]')
       from (
         select
           l.id,
           l.title,
           l.content_type,
           l."order"        as lesson_order,
           mo.title         as module_title,
           mo."order"       as mod_order,
           (select count(*)::int from public.progress pr
            where pr.lesson_id = l.id and pr.status = 'completed') as completions,
           (select count(*)::int from public.progress pr
            where pr.lesson_id = l.id and pr.status = 'in_progress') as in_progress
         from public.lessons l
         join public.modules mo on mo.id = l.module_id
         where mo.course_id = p_course_id
       ) row),

    -- ── Quiz stats ────────────────────────────────────────
    'quizzes',
      (select coalesce(json_agg(row), '[]')
       from (
         select
           l.title          as lesson_title,
           count(qa.id)::int              as total_attempts,
           count(qa.id) filter (where qa.passed)::int as passed_attempts,
           round(avg(qa.score)::numeric, 1) as avg_score,
           round(
             100.0 * count(qa.id) filter (where qa.passed) / nullif(count(qa.id), 0), 1
           ) as pass_rate
         from public.quizzes q
         join public.lessons l on l.id = q.lesson_id
         join public.modules mo on mo.id = l.module_id
         left join public.quiz_attempts qa on qa.quiz_id = q.id
         where mo.course_id = p_course_id
         group by l.title, q.id
       ) row)

  ) into v_result;

  return v_result;
end;
$$;
