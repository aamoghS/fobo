-- Fields the app's screens show (src/data/*.ts): plan details, a person's bio and avatar tint,
-- and the caller's sign-in email. Times leave the database as the owner's local wall-clock time.

-- Plan detail (src/data/plans.ts PlanDetail): the cost note, the exit plan note, the reminder.
alter table events add column cost_note text;
alter table events add column exit_note text;
alter table events add column reminder text;

-- People (src/data/people.ts Person): bio and avatar ring tint, a colour token name.
alter table profiles add column bio text;
alter table profiles add column tint text check (tint in ('tintPeach', 'tintSky', 'tintButter', 'tintRose', 'tintMint'));

create or replace view profile_public as
  select id, handle, name, character, bio, tint from profiles;

-- The caller's email from Neon Auth, for Settings. Empty where Neon Auth is not enabled.
create function app.my_email() returns text
language plpgsql stable security definer set search_path = pg_catalog, pg_temp
as $$
declare result text;
begin
  if to_regclass('neon_auth."user"') is null then
    return null;
  end if;
  execute 'select email::text from neon_auth."user" where id::text = $1' into result using app.current_user_id();
  return result;
end $$;
revoke execute on function app.my_email() from public;
grant execute on function app.my_email() to app_user;

-- A friend's blocks for one day, with start and end as the friend's local time ('2026-10-05T09:00'),
-- the format the app uses. Same privacy rules as before.
drop function friend_blocks(text, date);
create function friend_blocks(p_friend_id text, p_date date)
returns table (start_local text, end_local text, title text, category text)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select to_char(lower(e.time) at time zone p.timezone, 'YYYY-MM-DD"T"HH24:MI'),
         to_char(upper(e.time) at time zone p.timezone, 'YYYY-MM-DD"T"HH24:MI'),
         case when e.visibility = 'open' then e.title end,
         case when e.visibility in ('busy', 'open') then e.category end
  from public.profiles p
  join public.events e on e.user_id = p.id
  where p.id = p_friend_id
    and p.share_blocks
    and not e.declined
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = app.current_user_id() and f.addressee_id = p_friend_id)
          or (f.addressee_id = app.current_user_id() and f.requester_id = p_friend_id)))
    and e.time && tstzrange(p_date::timestamp at time zone p.timezone,
                            (p_date + 1)::timestamp at time zone p.timezone)
  order by lower(e.time)
$$;
revoke execute on function friend_blocks(text, date) from public;
grant execute on function friend_blocks(text, date) to app_user;
