-- ─────────────────────────────────────────────────────────────────────────────
-- maybe_issue_certificate
-- Called after each lesson completion. Issues a certificate and marks the
-- enrollment as completed when ALL lessons are done.
-- Returns TRUE if a new certificate was just issued.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function maybe_issue_certificate(p_user_id uuid, p_lesson_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_course_id         uuid;
  v_total_lessons     int;
  v_completed_lessons int;
begin
  -- Resolve course from lesson
  select c.id into v_course_id
  from public.lessons l
  join public.modules m  on m.id = l.module_id
  join public.courses c  on c.id = m.course_id
  where l.id = p_lesson_id;

  if v_course_id is null then return false; end if;

  -- Certificate already exists → nothing to do
  if exists (
    select 1 from public.certificates
    where user_id = p_user_id and course_id = v_course_id
  ) then return false; end if;

  -- Count total lessons in course
  select count(*)::int into v_total_lessons
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = v_course_id;

  -- Count lessons completed by this user in this course
  select count(*)::int into v_completed_lessons
  from public.progress pr
  join public.lessons l  on l.id  = pr.lesson_id
  join public.modules m  on m.id  = l.module_id
  where m.course_id = v_course_id
    and pr.user_id  = p_user_id
    and pr.status   = 'completed';

  -- Not done yet
  if v_completed_lessons < v_total_lessons then return false; end if;

  -- Issue certificate
  insert into public.certificates (user_id, course_id)
  values (p_user_id, v_course_id)
  on conflict (user_id, course_id) do nothing;

  -- Mark enrollment completed
  update public.enrollments
  set completed_at = now()
  where user_id = p_user_id and course_id = v_course_id and completed_at is null;

  return true;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- verify_certificate
-- Public (anon-safe) function. Returns certificate info for a given code.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function verify_certificate(p_code text)
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  select json_build_object(
    'valid',             true,
    'student_name',      pr.name,
    'course_title',      c.title,
    'issued_at',         cert.issued_at,
    'verification_code', cert.verification_code
  ) into v_result
  from public.certificates cert
  join public.profiles pr on pr.id = cert.user_id
  join public.courses  c  on c.id  = cert.course_id
  where upper(cert.verification_code) = upper(p_code);

  if v_result is null then
    return json_build_object('valid', false);
  end if;

  return v_result;
end;
$$;

-- Allow unauthenticated callers to invoke verify_certificate
grant execute on function verify_certificate(text) to anon;
