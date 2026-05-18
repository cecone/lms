-- Returns total and completed lesson counts per enrolled course for a given user.
create or replace function get_user_courses_progress(p_user_id uuid)
returns table(course_id uuid, total_lessons int, completed_lessons int)
language sql
security definer
stable
as $$
  select
    e.course_id,
    count(distinct l.id)::int as total_lessons,
    count(pr.id) filter (where pr.status = 'completed')::int as completed_lessons
  from public.enrollments e
  join public.modules m on m.course_id = e.course_id
  join public.lessons l on l.module_id = m.id
  left join public.progress pr
    on pr.lesson_id = l.id and pr.user_id = p_user_id
  where e.user_id = p_user_id
  group by e.course_id;
$$;
