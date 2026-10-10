-- The You tab (src/data/profile.ts): stress-relief activities for the Capacity Profile, and the
-- achievements a user has earned (the catalog itself lives in the API, matching the app).
alter table profiles add column stress_relief text[] not null default '{}';
alter table profiles add column created_at timestamptz not null default now();

create table achievements (
  user_id        text not null references profiles on delete cascade,
  achievement_id text not null check (achievement_id in ('irish-goodbye', 'slow-steady', 'merrier', 'first-week')),
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table achievements enable row level security;
alter table achievements force row level security;
grant select, insert on achievements to app_user;
create policy achievements_owner on achievements to app_user
  using (user_id = app.current_user_id()) with check (user_id = app.current_user_id());
