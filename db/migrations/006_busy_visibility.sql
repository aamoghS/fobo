-- Three levels of what friends see: private (grey block), busy (block and category, the default),
-- open (block, category and title). Also lets day_scores return the caller's own days.

alter table events drop constraint events_visibility_check;
alter table events add constraint events_visibility_check
  check (visibility in ('private', 'busy', 'open'));
alter table events alter column visibility set default 'busy';

create or replace function friend_blocks(p_friend_id text, p_date date)
returns table (span tstzrange, title text, category text)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select e.time,
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

create or replace function day_scores(p_friend_id text, p_from date, p_to date)
returns table (day date, load integer, room integer)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select d.day,
         greatest(coalesce(sum(e.cost) filter (where not e.declined), 0), 0)::integer,
         10  -- DAY_ROOM: must match packages/core DAY_ROOM and server/src/time.ts.
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
    and (p.id = app.current_user_id()
      or (p.share_scores
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = app.current_user_id() and f.addressee_id = p_friend_id)
              or (f.addressee_id = app.current_user_id() and f.requester_id = p_friend_id)))))
  group by d.day
  order by d.day
$$;
