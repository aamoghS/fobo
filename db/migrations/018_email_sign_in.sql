-- Email and password sign-in through the API. Passwords are stored as bcrypt hashes (pgcrypto's
-- crypt), and only app_service can read them.
create table email_accounts (
  user_id       text primary key references profiles on delete cascade,
  email         text not null unique check (email = lower(email)),
  password_hash text not null
);
alter table email_accounts enable row level security;
alter table email_accounts force row level security;
grant select, insert on email_accounts to app_service;
create policy email_accounts_service on email_accounts to app_service using (true) with check (true);

-- The caller's email, from their Google or email sign-in.
create or replace function app.my_email() returns text
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select coalesce(
    (select email from public.google_accounts where user_id = app.current_user_id()),
    (select email from public.email_accounts where user_id = app.current_user_id()))
$$;

-- Adding a friend by the email they signed in with. Returns only their id.
create function app.profile_id_by_email(p_email text) returns text
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select user_id from public.google_accounts where lower(email) = lower(p_email)
  union all
  select user_id from public.email_accounts where email = lower(p_email)
  limit 1
$$;
revoke execute on function app.profile_id_by_email(text) from public;
grant execute on function app.profile_id_by_email(text) to app_user;
