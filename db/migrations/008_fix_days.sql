-- The planner saves each day's load before and after a fix, and when it was made and applied.
alter table calendar_fixes add column days jsonb not null default '[]';
alter table calendar_fixes add column created_at timestamptz not null default now();
alter table calendar_fixes add column applied_at timestamptz;
grant update (applied_at) on calendar_fixes to app_service;

-- The planner reads the profile and check-in memories as app_service, always filtered by user id.
grant select on profiles, memories to app_service;
create policy profiles_service_read on profiles for select to app_service using (true);
create policy memories_service_read on memories for select to app_service using (true);
