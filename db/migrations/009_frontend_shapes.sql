-- Match the app's Plan type (src/features/plans/types.ts): costs in tenths out of DAY_ROOM,
-- a status instead of a declined flag, and a "leave by" time. Onboarding answers live on the profile.

alter table events alter column cost type numeric(3, 1);
alter table events drop constraint events_cost_check;
alter table events add constraint events_cost_check check (cost between -1 and 10);

alter table events add column status text not null default 'accepted'
  check (status in ('proposed', 'accepted', 'moved', 'declined'));
update events set status = 'declined' where declined;
alter table events drop column declined;
-- Kept for the friend functions and day scores: a declined plan never counts or shows.
alter table events add column declined boolean generated always as (status = 'declined') stored;

alter table events add column leave_by text check (leave_by ~ '^\d{1,2}:\d{2}$');

alter table profiles add column onboarding jsonb not null default '{}';

-- Loads are no longer whole numbers.
drop function day_scores(text, date, date);
create function day_scores(p_friend_id text, p_from date, p_to date)
returns table (day date, load numeric, room integer)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select d.day,
         greatest(coalesce(sum(e.cost) filter (where not e.declined), 0), 0),
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
revoke execute on function day_scores(text, date, date) from public;
grant execute on function day_scores(text, date, date) to app_user;
