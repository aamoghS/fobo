// Google sync against a fake Google. Needs TEST_DATABASE_URL (throwaway database).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool, upsertProfile, withService, withUser } from '../src/db.ts';
import { googleAccount, syncConnection } from '../src/sync.ts';
import type { GoogleEvent } from '../src/google.ts';

process.env.AUTH_SECRET = 'test-auth-secret';
const pool = createPool(process.env.TEST_DATABASE_URL);
const user = { sub: `g${Date.now()}` };
const realFetch = globalThis.fetch;
let googleItems: GoogleEvent[] = [];
let expired = false;
const seen: string[] = [];
let connId = '';
let tokenRequests: string[] = [];
const CALENDAR = 'https://www.googleapis.com/auth/calendar.events';

const at = (h: number) => `2030-02-01T${String(h).padStart(2, '0')}:00:00Z`;

before(async () => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      tokenRequests.push(String(init?.body));
      return Response.json({ access_token: 'access' });
    }
    if (url.startsWith('https://www.googleapis.com/calendar/v3/')) {
      seen.push(url);
      if (expired && url.includes('syncToken=')) return new Response('gone', { status: 410 });
      return Response.json({ items: googleItems, nextSyncToken: `tok${seen.length}` });
    }
    return realFetch(input, init);
  }) as typeof fetch;
  await withUser(pool, user, (c) => upsertProfile(c, user.sub));
  await pool.query(`insert into google_accounts (user_id, google_sub, email, scope, refresh_token)
    values ($1, $1, 'a@x.com', $2, pgp_sym_encrypt('refresh-secret', 'test-auth-secret'))`, [user.sub, `openid email ${CALENDAR}`]);
  connId = await withService(pool, async (c) =>
    (await c.$client.query(
      `insert into calendar_connections (user_id, account_email) values ($1, 'a@x.com') returning id`,
      [user.sub],
    )).rows[0].id);
});

after(async () => {
  globalThis.fetch = realFetch;
  await pool.query('delete from profiles where id = $1', [user.sub]);
  await pool.end();
});

const titles = () => withUser(pool, user, async (c) =>
  (await c.$client.query('select title, declined, with_people from events order by lower(time)')).rows);

test('tokens are stored encrypted, used only with Calendar access, never readable as app_user', async () => {
  const account = await withService(pool, (c) => googleAccount(c, user.sub));
  assert.equal(account?.email, 'a@x.com');
  assert.equal(account?.refresh_token, 'refresh-secret');
  await assert.rejects(withUser(pool, user, (c) => c.$client.query('select * from google_accounts')));
  await pool.query('update google_accounts set scope = $2 where user_id = $1', [user.sub, 'openid email']);
  assert.equal(await withService(pool, (c) => googleAccount(c, user.sub)), null, 'no Calendar scope');
  await pool.query('update google_accounts set scope = $2 where user_id = $1', [user.sub, `openid ${CALENDAR}`]);
});

test('first sync has a time window, skips all-day events, keeps people', async () => {
  googleItems = [
    { id: 'a', status: 'confirmed', summary: 'Standup', start: { dateTime: at(9) }, end: { dateTime: at(10) },
      attendees: [{ email: 'me@x.com', self: true }, { email: 'b@x.com', displayName: 'Bea' }] },
    { id: 'b', status: 'confirmed', summary: 'Holiday', start: { date: '2030-02-01' }, end: { date: '2030-02-02' } },
    { id: 'c', status: 'confirmed', summary: 'Party', start: { dateTime: at(19) }, end: { dateTime: at(22) },
      attendees: [{ email: 'me@x.com', self: true, responseStatus: 'declined' }] },
  ];
  const r = await withService(pool, (c) => syncConnection(c, connId));
  assert.deepEqual(r, { upserted: 2, removed: 0 });
  assert.ok(tokenRequests[0].includes('refresh_token=refresh-secret'));
  assert.ok(seen[0].includes('timeMin=') && seen[0].includes('timeMax='));
  assert.deepEqual(await titles(), [
    { title: 'Standup', declined: false, with_people: ['Bea'] },
    { title: 'Party', declined: true, with_people: [] },
  ]);
});

test('next sync uses the sync token, applies changes and deletions, keeps Fobo fields', async () => {
  await withUser(pool, user, (c) => c.$client.query("update events set cost = 3, category = 'work' where title = 'Standup'"));
  googleItems = [
    { id: 'a', status: 'confirmed', summary: 'Standup moved', start: { dateTime: at(11) }, end: { dateTime: at(12) } },
    { id: 'c', status: 'cancelled' },
  ];
  const r = await withService(pool, (c) => syncConnection(c, connId));
  assert.deepEqual(r, { upserted: 1, removed: 1 });
  assert.ok(seen.at(-1)!.includes('syncToken=tok1'));
  const rows = await withUser(pool, user, async (c) => (await c.$client.query('select title, cost, category from events')).rows);
  assert.deepEqual(rows, [{ title: 'Standup moved', cost: 3, category: 'work' }]);
});

test('an expired sync token falls back to a full sync', async () => {
  expired = true;
  googleItems = [];
  const before = seen.length;
  await withService(pool, (c) => syncConnection(c, connId));
  assert.equal(seen.length - before, 2);
  assert.ok(seen.at(-1)!.includes('timeMin='));
});
