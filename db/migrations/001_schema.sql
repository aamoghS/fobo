-- Fobo schema. Plain Postgres. Run as a role with BYPASSRLS (on Neon: the project owner role),
-- because the SECURITY DEFINER functions in 003 must read other people's rows through FORCE RLS.

do $$
begin
  if not (select rolsuper or rolbypassrls from pg_roles where rolname = current_user) then
    raise exception 'run migrations as a role with BYPASSRLS';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_service') then
    create role app_service nologin;
  end if;
end $$;

-- The API connects as the owner role and runs SET LOCAL ROLE app_user | app_service per request.
do $$ begin execute format('grant app_user, app_service to %I', current_user); end $$;

create extension if not exists pgcrypto;  -- API encrypts refresh tokens with pgp_sym_encrypt

create schema if not exists app;
grant usage on schema app to app_user, app_service;

-- Current user id: the `sub` claim of the Neon Auth JWT, set per request with SET LOCAL.
create or replace function app.current_user_id() returns text
language sql stable
as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')
$$;
grant execute on function app.current_user_id() to app_user, app_service;

create table profiles (
  id              text primary key,
  handle          text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  name            text,
  character       jsonb,
  timezone        text not null default 'UTC',
  recharge_style  text,
  busy_streak     integer not null default 0,
  protected_hours jsonb,
  write_back      boolean not null default false,
  share_blocks    boolean not null default false,
  share_scores    boolean not null default false
);

-- Auto handle: 'user_' + first 19 chars of the id (non-alphanumerics stripped to fit the check).
create function app.default_handle() returns trigger
language plpgsql
as $$
begin
  if new.handle is null then
    new.handle := 'user_' || left(lower(regexp_replace(new.id, '[^A-Za-z0-9]', '', 'g')), 19);
  end if;
  return new;
end $$;
create trigger profiles_default_handle before insert on profiles
  for each row execute function app.default_handle();

create table calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles on delete cascade,
  provider      text not null default 'google' check (provider = 'google'),
  account_email text not null,
  write_back    boolean not null default true,
  sync_token    text
);

create table events (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles on delete cascade,
  title         text not null,
  time          tstzrange not null,
  category      text,
  cost          smallint not null default 0 check (cost between -1 and 5),
  visibility    text not null default 'private' check (visibility in ('private', 'open')),
  protected     boolean not null default false,
  declined      boolean not null default false,  -- marked, never deleted
  source        text not null default 'capacity' check (source in ('capacity', 'google')),
  connection_id uuid references calendar_connections on delete set null,
  external_id   text,
  etag          text,
  unique (connection_id, external_id)
);
create index events_user_id on events (user_id);

create table connection_secrets (
  connection_id uuid primary key references calendar_connections on delete cascade,
  refresh_token bytea not null  -- pgp_sym_encrypt(token, key); key lives in the API environment
);

create table memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references profiles on delete cascade,
  kind       text not null,
  person     text,
  felt       text,
  created_at timestamptz not null default now()
);

create table friendships (
  requester_id text not null references profiles on delete cascade,
  addressee_id text not null references profiles on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index friendships_one_per_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table calendar_fixes (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references profiles on delete cascade,
  summary      text not null,
  changes      jsonb not null,
  score_before numeric,
  score_after  numeric,
  status       text not null default 'proposed' check (status in ('proposed', 'applied', 'dismissed'))
);
