-- One Google event can sit on two calendars of the same account with the same id, so an event is
-- unique per calendar, not per account.
alter table events drop constraint events_connection_id_external_id_key;
alter table events add constraint events_connection_calendar_external_key unique (connection_id, calendar_id, external_id);

-- Adding a friend by email: a Google account (whose email Google verified) wins over an email sign-up
-- with the same address, which nobody has verified.
create or replace function app.profile_id_by_email(p_email text) returns text
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select user_id from (
    select user_id, 0 as rank from public.google_accounts where lower(email) = lower(p_email) and email <> ''
    union all
    select user_id, 1 from public.email_accounts where email = lower(p_email)
  ) found
  order by rank
  limit 1
$$;
