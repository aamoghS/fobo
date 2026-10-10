-- RLS tests. Run as the owner role on a throwaway branch:
--   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/rls.sql
-- Everything runs in one transaction and is rolled back.

begin;

-- Fixtures (owner bypasses RLS)
insert into profiles (id, handle, timezone, share_blocks, share_scores) values
  ('alice', 'alice', 'UTC', true, true),
  ('bob',   'bob',   'UTC', true, false),  -- bob opts out of scores
  ('carol', 'carol', 'UTC', false, false),
  ('dave',  'dave',  'UTC', false, false);

insert into friendships (requester_id, addressee_id, status) values
  ('alice', 'bob',   'accepted'),
  ('carol', 'alice', 'pending');

insert into events (user_id, title, time, category, cost, visibility, status) values
  ('alice', 'Dinner',  '[2030-01-15 18:00Z, 2030-01-15 20:00Z)', 'social', 3, 'open',    'accepted'),
  ('alice', 'Therapy', '[2030-01-15 10:00Z, 2030-01-15 11:00Z)', 'health', 4, 'private', 'accepted'),
  ('alice', 'Gym',     '[2030-01-15 07:00Z, 2030-01-15 08:00Z)', 'sport',  2, 'open',    'declined'),
  ('bob',   'Work',    '[2030-01-15 09:00Z, 2030-01-15 17:00Z)', 'work',   5, 'private', 'accepted');

insert into calendar_connections (id, user_id, account_email)
  values ('00000000-0000-0000-0000-0000000000c1', 'alice', 'alice@example.com');

insert into calendar_fixes (id, user_id, summary, changes) values
  ('00000000-0000-0000-0000-0000000000f1', 'alice', 'Move gym', '{}'),
  ('00000000-0000-0000-0000-0000000000f2', 'alice', 'Drop dinner', '{}');

set local role app_user;

-- Accepted friend: sees blocks, hidden titles and categories for private events, declined excluded.
select set_config('request.jwt.claims', '{"sub":"bob"}', true);
do $$ begin
  assert (select count(*) from friend_blocks('alice', '2030-01-15')) = 2,
    'friend sees non-declined blocks';
  assert (select count(*) from friend_blocks('alice', '2030-01-15')
          where title = 'Dinner' and category = 'social') = 1,
    'open event shows title and category';
  assert (select count(*) from friend_blocks('alice', '2030-01-15')
          where title is null and category is null) = 1,
    'private event hides title and category';
  assert (select load from day_scores('alice', '2030-01-15', '2030-01-15')) = 7,
    'score sums non-declined costs';
  assert (select room from day_scores('alice', '2030-01-15', '2030-01-15')) = 10, 'day room is 10';
  assert (select count(*) from events where user_id = 'alice') = 0, 'friends never read events';
  assert (select count(*) from profiles) = 1, 'profiles table shows only own row';
  assert (select count(*) from profile_public) = 4, 'public profiles visible';
end $$;

-- Score opt-out: alice is bob's friend, bob does not share scores.
select set_config('request.jwt.claims', '{"sub":"alice"}', true);
do $$ begin
  assert (select count(*) from day_scores('bob', '2030-01-15', '2030-01-15')) = 0, 'score opt-out';
  assert (select count(*) from friend_blocks('bob', '2030-01-15')) = 1, 'blocks still shared';
end $$;

-- Pending friend sees nothing.
select set_config('request.jwt.claims', '{"sub":"carol"}', true);
do $$ begin
  assert (select count(*) from friend_blocks('alice', '2030-01-15')) = 0, 'pending: no blocks';
  assert (select count(*) from day_scores('alice', '2030-01-15', '2030-01-15')) = 0, 'pending: no scores';
end $$;

-- Stranger sees nothing.
select set_config('request.jwt.claims', '{"sub":"dave"}', true);
do $$ begin
  assert (select count(*) from friend_blocks('alice', '2030-01-15')) = 0, 'stranger: no blocks';
  assert (select count(*) from day_scores('alice', '2030-01-15', '2030-01-15')) = 0, 'stranger: no scores';
  assert (select count(*) from events) = 0, 'stranger: no events';
  assert (select count(*) from friendships) = 0, 'stranger: no friendships';
  assert (select count(*) from calendar_connections) = 0, 'stranger: no connections';
  assert (select count(*) from calendar_fixes) = 0, 'stranger: no fixes';
end $$;

-- app_user cannot read Google tokens, even its own.
select set_config('request.jwt.claims', '{"sub":"alice"}', true);
do $$ begin
  begin
    perform 1 from google_accounts;
    raise exception 'app_user read google tokens';
  exception when insufficient_privilege then null;
  end;
end $$;

-- app_user cannot edit sync cursors.
do $$ begin
  begin
    update calendar_connections set sync_token = 'x';
    raise exception 'app_user edited sync_token';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Requester cannot self-accept, nor insert an accepted row.
select set_config('request.jwt.claims', '{"sub":"carol"}', true);
do $$ declare n int; begin
  update friendships set status = 'accepted' where requester_id = 'carol' and addressee_id = 'alice';
  get diagnostics n = row_count;
  assert n = 0, 'requester self-accepted';
  begin
    insert into friendships (requester_id, addressee_id, status) values ('carol', 'dave', 'accepted');
    raise exception 'requester inserted accepted friendship';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Addressee can accept; then carol sees alice's blocks.
select set_config('request.jwt.claims', '{"sub":"alice"}', true);
do $$ declare n int; begin
  update friendships set status = 'accepted' where requester_id = 'carol' and addressee_id = 'alice';
  get diagnostics n = row_count;
  assert n = 1, 'addressee could not accept';
end $$;
select set_config('request.jwt.claims', '{"sub":"carol"}', true);
do $$ begin
  assert (select count(*) from friend_blocks('alice', '2030-01-15')) = 2, 'accepted friend sees blocks';
end $$;

-- Owner can dismiss a fix but not mark it applied.
select set_config('request.jwt.claims', '{"sub":"alice"}', true);
do $$ declare n int; begin
  begin
    update calendar_fixes set status = 'applied' where id = '00000000-0000-0000-0000-0000000000f1';
    raise exception 'app_user marked a fix applied';
  exception when insufficient_privilege then null;
  end;
  update calendar_fixes set status = 'dismissed' where id = '00000000-0000-0000-0000-0000000000f2';
  get diagnostics n = row_count;
  assert n = 1, 'owner could not dismiss';
end $$;

-- app_service can mark a fix applied and read secrets.
set local role app_service;
do $$ declare n int; begin
  update calendar_fixes set status = 'applied' where id = '00000000-0000-0000-0000-0000000000f1';
  get diagnostics n = row_count;
  assert n = 1, 'app_service could not apply fix';
  perform 1 from google_accounts;  -- app_service may read Google tokens
end $$;

-- Deleting a user cascades to everything they own.
reset role;
delete from profiles where id = 'alice';
do $$ begin
  assert (select count(*) from events where user_id = 'alice') = 0, 'events cascade';
  assert (select count(*) from calendar_connections where user_id = 'alice') = 0, 'connections cascade';
  assert (select count(*) from calendar_fixes where user_id = 'alice') = 0, 'fixes cascade';
  assert (select count(*) from friendships where 'alice' in (requester_id, addressee_id)) = 0,
    'friendships cascade';
end $$;

select 'rls tests passed' as result;

rollback;
