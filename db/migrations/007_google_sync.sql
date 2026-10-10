-- Google sync: who else is on a plan (only solo plans can be moved), when a connection last
-- synced, and one connection per Google account.
alter table events add column with_people text[] not null default '{}';
alter table calendar_connections add column last_synced_at timestamptz;
alter table calendar_connections add constraint calendar_connections_one_per_account
  unique (user_id, account_email);
