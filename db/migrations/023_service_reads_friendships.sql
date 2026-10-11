-- Inviting friends to a plan looks up their addresses as app_service (server/src/routes/events.ts guests()),
-- which checks the friendship first. app_service could not read friendships, so every invite failed.
grant select on friendships to app_service;
create policy friendships_service_read on friendships for select to app_service using (true);
