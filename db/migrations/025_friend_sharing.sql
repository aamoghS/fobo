-- Friend sharing, end to end (Settings > What friends see; People detail > Check availability).

-- Which of the two switches a friend has on: their busy blocks, their day load. A row only for an
-- accepted friend of the caller, so GET /friends/:id/days can tell "shares only blocks" from "shares
-- nothing" (day_scores alone returns no days unless scores are shared).
create function friend_sharing(p_friend_id text)
returns table (blocks boolean, scores boolean)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select p.share_blocks, p.share_scores
  from public.profiles p
  where p.id = p_friend_id
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = app.current_user_id() and f.addressee_id = p_friend_id)
          or (f.addressee_id = app.current_user_id() and f.requester_id = p_friend_id)))
$$;
revoke execute on function friend_sharing(text) from public;
grant execute on function friend_sharing(text) to app_user;

-- Same as 011, but invites the friend hasn't answered (proposed) no longer show as busy, matching
-- day_scores (020), which doesn't count them either.
create or replace function friend_blocks(p_friend_id text, p_date date)
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
    and e.status not in ('declined', 'proposed')
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

-- The sign-in addresses (lowercased) of those of p_ids who are the caller's accepted friends. Google
-- events name guests by address (server/src/sync.ts), so People counts plans with a friend from Google
-- too. app_user can't read google_accounts or email_accounts itself.
create function friend_addresses(p_ids text[])
returns table (id text, address text)
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select a.user_id, lower(a.email)
  from (
    select user_id, email from public.google_accounts where email <> ''
    union all
    select user_id, email from public.email_accounts
  ) a
  where a.user_id = any(p_ids)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = app.current_user_id() and f.addressee_id = a.user_id)
          or (f.addressee_id = app.current_user_id() and f.requester_id = a.user_id)))
$$;
revoke execute on function friend_addresses(text[]) from public;
grant execute on function friend_addresses(text[]) to app_user;
