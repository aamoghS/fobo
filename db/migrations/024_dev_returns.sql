-- Expo Go dev servers that Google sign-in may send a session back to, by exact host (a tunnel like
-- abc-user-8081.exp.direct, or a LAN host:port). npm run dev:all adds the one it starts; only someone with
-- the project's database URL can. Replaces matching tunnels by Expo username, which anyone could imitate.
create table dev_returns (
  host     text primary key,
  added_at timestamptz not null default now()
);
alter table dev_returns enable row level security;
alter table dev_returns force row level security;
grant select on dev_returns to app_service;
create policy dev_returns_service_read on dev_returns for select to app_service using (true);
