-- Sync every calendar on a Google account, not just the primary one: each event remembers its calendar
-- (for write-back), and each calendar keeps its own sync token.
alter table events add column calendar_id text;
update events set calendar_id = 'primary' where source = 'google';

create table calendar_sync (
  connection_id uuid not null references calendar_connections on delete cascade,
  calendar_id   text not null,
  sync_token    text,
  primary key (connection_id, calendar_id)
);
alter table calendar_sync enable row level security;
alter table calendar_sync force row level security;
grant select, insert, update, delete on calendar_sync to app_service;
create policy calendar_sync_service on calendar_sync to app_service using (true) with check (true);
