-- Google accounts signed in through the API (web, Expo Go, builds). The refresh token is stored as
-- pgp_sym_encrypt(token, AUTH_SECRET) and only app_service can read it.
create table google_accounts (
  user_id       text primary key references profiles on delete cascade,
  google_sub    text not null unique,
  email         text not null,
  scope         text not null default '',
  refresh_token bytea
);
alter table google_accounts enable row level security;
alter table google_accounts force row level security;
grant select, insert, update on google_accounts to app_service;
create policy google_accounts_service on google_accounts to app_service using (true) with check (true);

-- The bridge creates profiles for new Google users.
grant insert on profiles to app_service;
create policy profiles_service_insert on profiles for insert to app_service with check (true);
