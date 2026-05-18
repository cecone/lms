-- Function: touch_streak(p_user_id uuid)
-- Called on every page visit (dashboard). Updates last_activity_date and
-- recalculates streak_days without granting extra XP.
create or replace function touch_streak(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_today   date := current_date;
  v_row     user_xp%rowtype;
begin
  -- Upsert row so new users are handled
  insert into user_xp (user_id, total_xp, level, streak_days, last_activity_date)
  values (p_user_id, 0, 1, 1, v_today)
  on conflict (user_id) do nothing;

  select * into v_row from user_xp where user_id = p_user_id;

  -- Already updated today — nothing to do
  if v_row.last_activity_date = v_today then
    return;
  end if;

  update user_xp
  set
    last_activity_date = v_today,
    streak_days = case
      when v_row.last_activity_date = v_today - 1 then v_row.streak_days + 1  -- consecutive day
      else 1                                                                    -- gap → reset
    end
  where user_id = p_user_id;
end;
$$;
