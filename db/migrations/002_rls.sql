alter table profiles             enable row level security;
alter table profiles             force row level security;
alter table events               enable row level security;
alter table events               force row level security;
alter table calendar_connections enable row level security;
alter table calendar_connections force row level security;
alter table connection_secrets   enable row level security;
alter table connection_secrets   force row level security;
alter table memories             enable row level security;
alter table memories             force row level security;
alter table friendships          enable row level security;
alter table friendships          force row level security;
alter table calendar_fixes       enable row level security;
alter table calendar_fixes       force row level security;

-- profiles: owner only. Other people's profiles come from profile_public.
grant select, insert, update, delete on profiles to app_user;
create policy profiles_owner on profiles to app_user
  using (id = app.current_user_id()) with check (id = app.current_user_id());

-- events: owner only. Friends never read this table.
grant select, insert, update, delete on events to app_user;
create policy events_owner on events to app_user
  using (user_id = app.current_user_id()) with check (user_id = app.current_user_id());
grant select, insert, update, delete on events to app_service;  -- Google sync
create policy events_service on events to app_service using (true) with check (true);

-- calendar_connections: owner reads, toggles write_back, disconnects. Sync cursors are service-only.
grant select, delete on calendar_connections to app_user;
grant update (write_back) on calendar_connections to app_user;
create policy connections_owner_read on calendar_connections for select to app_user
  using (user_id = app.current_user_id());
create policy connections_owner_update on calendar_connections for update to app_user
  using (user_id = app.current_user_id()) with check (user_id = app.current_user_id());
create policy connections_owner_delete on calendar_connections for delete to app_user
  using (user_id = app.current_user_id());
grant select, insert, update on calendar_connections to app_service;
create policy connections_service on calendar_connections to app_service using (true) with check (true);

-- connection_secrets: no grant and no policy for app_user.
grant select, insert, update, delete on connection_secrets to app_service;
create policy secrets_service on connection_secrets to app_service using (true) with check (true);

-- memories: owner only.
grant select, insert, update, delete on memories to app_user;
create policy memories_owner on memories to app_user
  using (user_id = app.current_user_id()) with check (user_id = app.current_user_id());

-- friendships
grant select, insert, delete on friendships to app_user;
grant update (status) on friendships to app_user;
create policy friendships_select on friendships for select to app_user
  using (app.current_user_id() in (requester_id, addressee_id));
create policy friendships_insert on friendships for insert to app_user
  with check (requester_id = app.current_user_id() and status = 'pending');
create policy friendships_update on friendships for update to app_user
  using (addressee_id = app.current_user_id())
  with check (addressee_id = app.current_user_id() and status in ('accepted', 'blocked'));
create policy friendships_delete on friendships for delete to app_user
  using (app.current_user_id() in (requester_id, addressee_id));

-- calendar_fixes: owner reads and dismisses; only app_service creates and applies.
grant select on calendar_fixes to app_user;
grant update (status) on calendar_fixes to app_user;
create policy fixes_owner_read on calendar_fixes for select to app_user
  using (user_id = app.current_user_id());
create policy fixes_owner_dismiss on calendar_fixes for update to app_user
  using (user_id = app.current_user_id() and status = 'proposed')
  with check (user_id = app.current_user_id() and status = 'dismissed');
grant select, insert on calendar_fixes to app_service;
grant update (status) on calendar_fixes to app_service;
create policy fixes_service_read on calendar_fixes for select to app_service using (true);
create policy fixes_service_insert on calendar_fixes for insert to app_service
  with check (status = 'proposed');
create policy fixes_service_apply on calendar_fixes for update to app_service
  using (status = 'proposed') with check (status = 'applied');
