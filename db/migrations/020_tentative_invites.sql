-- Invites the user hasn't answered (status 'proposed', from Google's needsAction or tentative) show on
-- Weigh a plan and don't fill a day until accepted.
create or replace function day_scores(p_friend_id text, p_from date, p_to date)
returns table (day date, load numeric, room integer)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select d.day,
         greatest(coalesce(sum(e.cost) filter (where e.status not in ('declined', 'proposed')), 0), 0),
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
