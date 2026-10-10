// API-level privacy test. Needs TEST_DATABASE_URL pointing at a throwaway Neon branch with
// db/migrations applied, connecting as the owner role. Never point it at production.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { createPool, upsertProfile, withUser } from '../src/db.ts';

const url = process.env.TEST_DATABASE_URL;
const run = Date.now().toString(36);
const ann = { sub: `ann${run}` };
const ben = { sub: `ben${run}` };
const sam = { sub: `sam${run}` };
const day = '2030-01-15';
let pool: Pool;

before(async () => {
  pool = createPool(url);
  for (const u of [ann, ben, sam]) {
    await withUser(pool, u, (c) => upsertProfile(c, u.sub));
  }
  await withUser(pool, ann, async (c) => {
    await c.$client.query('update profiles set share_blocks = true, share_scores = true where id = $1', [ann.sub]);
    await c.$client.query(
      `insert into events (user_id, title, time, category, cost, visibility) values
         ($1, 'Lunch', '[2030-01-15 12:00Z, 2030-01-15 13:00Z)', 'social', 2, 'open'),
         ($1, 'Doctor', '[2030-01-15 15:00Z, 2030-01-15 16:00Z)', 'health', 3, 'private')`,
      [ann.sub],
    );
    await c.$client.query("insert into friendships (requester_id, addressee_id) values ($1, $2)", [ann.sub, ben.sub]);
  });
  await withUser(pool, ben, (c) =>
    c.$client.query("update friendships set status = 'accepted' where requester_id = $1", [ann.sub]),
  );
});

after(async () => {
  await pool.query('delete from profiles where id = any($1)', [[ann.sub, ben.sub, sam.sub]]);
  await pool.end();
});

test('first sign-in creates an auto handle', async () => {
  const { rows } = await withUser(pool, sam, (c) => c.$client.query('select handle from my_profile'));
  assert.equal(rows[0].handle, `user_${sam.sub}`.slice(0, 24));
});

test('friend sees blocks with private titles hidden, and scores', async () => {
  const blocks = await withUser(pool, ben, (c) =>
    c.$client.query('select title, category from friend_blocks($1, $2)', [ann.sub, day]),
  );
  assert.deepEqual(
    blocks.rows.map((r) => r.title).sort(),
    ['Lunch', null].sort(),
  );
  const scores = await withUser(pool, ben, (c) =>
    c.$client.query('select load, room from day_scores($1, $2, $2)', [ann.sub, day]),
  );
  assert.deepEqual(scores.rows, [{ load: 5, room: 10 }]);
});

test('friend cannot read events directly', async () => {
  const { rows } = await withUser(pool, ben, (c) =>
    c.$client.query('select * from events where user_id = $1', [ann.sub]),
  );
  assert.equal(rows.length, 0);
});

test('stranger sees nothing', async () => {
  await withUser(pool, sam, async (c) => {
    assert.equal((await c.$client.query('select * from friend_blocks($1, $2)', [ann.sub, day])).rows.length, 0);
    assert.equal((await c.$client.query('select * from day_scores($1, $2, $2)', [ann.sub, day])).rows.length, 0);
    assert.equal((await c.$client.query('select * from events')).rows.length, 0);
    assert.equal((await c.$client.query('select * from friendships')).rows.length, 0);
  });
});

test('stranger sees only public profile columns', async () => {
  const { rows } = await withUser(pool, sam, (c) =>
    c.$client.query('select * from profile_public where id = $1', [ann.sub]),
  );
  assert.deepEqual(Object.keys(rows[0]).sort(), ['character', 'handle', 'id', 'name']);
});
