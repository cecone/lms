-- Aggregated report for coordinators and admins.
create or replace function get_coordinator_report()
returns json
language plpgsql
security definer
stable
as $$
declare
  v_role text;
  v_result json;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role not in ('coordenador', 'admin') then
    raise exception 'Unauthorized';
  end if;

  select json_build_object(

    -- ── Overview ─────────────────────────────────────────
    'total_students',
      (select count(*)::int from public.profiles where role = 'aluno'),

    'total_enrollments',
      (select count(*)::int from public.enrollments),

    'total_completions',
      (select count(*)::int from public.enrollments where completed_at is not null),

    'published_courses',
      (select count(*)::int from public.courses where status = 'published'),

    -- ── Per-course breakdown ──────────────────────────────
    'courses',
      (select coalesce(json_agg(row order by row.enrollments desc), '[]')
       from (
         select
           c.id,
           c.title,
           c.accent_color,
           p.name                                              as creator_name,
           count(distinct e.id)::int                          as enrollments,
           count(distinct e.id) filter (where e.completed_at is not null)::int as completions,
           round(
             100.0 * count(distinct e.id) filter (where e.completed_at is not null)
             / nullif(count(distinct e.id), 0), 1
           )                                                  as completion_rate,
           -- avg progress: completed lessons / (total lessons * enrolled students)
           (select count(distinct l2.id)::int
            from public.modules m2 join public.lessons l2 on l2.module_id = m2.id
            where m2.course_id = c.id)                        as total_lessons
         from public.courses c
         join public.profiles p on p.id = c.creator_id
         left join public.enrollments e on e.course_id = c.id
         where c.status = 'published'
         group by c.id, c.title, c.accent_color, p.name
       ) row),

    -- ── Top students by XP ────────────────────────────────
    'top_students',
      (select coalesce(json_agg(row), '[]')
       from (
         select
           pr.name,
           pr.avatar_url,
           ux.total_xp,
           ux.level,
           ux.streak_days,
           (select count(*)::int from public.enrollments e where e.user_id = pr.id and e.completed_at is not null) as courses_completed
         from public.user_xp ux
         join public.profiles pr on pr.id = ux.user_id
         where pr.role = 'aluno'
         order by ux.total_xp desc
         limit 10
       ) row),

    -- ── Recent enrollments ────────────────────────────────
    'recent_enrollments',
      (select coalesce(json_agg(row), '[]')
       from (
         select
           pr.name   as student_name,
           pr.avatar_url,
           c.title   as course_title,
           c.accent_color,
           e.enrolled_at,
           e.completed_at
         from public.enrollments e
         join public.profiles pr on pr.id = e.user_id
         join public.courses  c  on c.id  = e.course_id
         order by e.enrolled_at desc
         limit 15
       ) row)

  ) into v_result;

  return v_result;
end;
$$;
