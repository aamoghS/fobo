-- Views run as their owner (BYPASSRLS), so profile_public sees every profile but only safe columns.
create view profile_public as
  select id, handle, name, character from profiles;
grant select on profile_public to app_user;

create view my_profile with (security_invoker = true) as
  select * from profiles where id = app.current_user_id();
grant select on my_profile to app_user;

-- A friend's blocks for one day (friend's timezone). Titles and categories only for open events.
create function friend_blocks(p_friend_id text, p_date date)
returns table (span tstzrange, title text, category text)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select e.time,
         case when e.visibility = 'open' then e.title end,
         case when e.visibility = 'open' then e.category end
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

-- A friend's daily load, at most 62 days per call.
create function day_scores(p_friend_id text, p_from date, p_to date)
returns table (day date, load integer, room integer)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select d.day,
         coalesce(sum(e.cost) filter (where not e.declined), 0)::integer,
         10  -- DAY_ROOM: must match packages/core DAY_ROOM and the API server's time helper.
  from public.profiles p
  cross join lateral (
    select g::date as day
    from generate_series(p_from, least(p_to, p_from + 61), interval '1 day') g
  ) d
  left join public.events e
    on e.user_id = p.id
   and lower(e.time) >= d.day::timestamp at time zone p.timezone
   and lower(e.time) <  (d.day + 1)::timestamp at time zone p.timezone
  where p.id = p_friend_id
    and p.share_scores
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = app.current_user_id() and f.addressee_id = p_friend_id)
          or (f.addressee_id = app.current_user_id() and f.requester_id = p_friend_id)))
  group by d.day
  order by d.day
$$;

revoke execute on function friend_blocks(text, date), day_scores(text, date, date) from public;
grant execute on function friend_blocks(text, date), day_scores(text, date, date) to app_user;
