// HTTP-level API test. Signs its own tokens and serves them from a local JWKS, so it needs only
// TEST_DATABASE_URL (a throwaway database with db/migrations applied). Never point it at production.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createPool } from '../src/db.ts';
import { createServer } from '../src/server.ts';

const run = Date.now().toString(36);
const ann = `ann${run}`;
const ben = `ben${run}`;
const sam = `sam${run}`;
const pool = createPool(process.env.TEST_DATABASE_URL);
let base = '';
let sign: (sub: string) => Promise<string>;
const servers: http.Server[] = [];

function listen(server: http.Server): Promise<string> {
  servers.push(server);
  return new Promise((ok) => server.listen(0, () => ok(`http://localhost:${(server.address() as AddressInfo).port}`)));
}

async function call(who: string | null, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (who) headers.authorization = `Bearer ${await sign(who)}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
}

before(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'test' };
  const jwksUrl = await listen(http.createServer((_, res) => res.end(JSON.stringify({ keys: [jwk] }))));
  process.env.NEON_AUTH_JWKS_URL = jwksUrl;
  sign = (sub) => new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  base = await listen(createServer(pool));
});

after(async () => {
  await pool.query('delete from profiles where id = any($1)', [[ann, ben, sam]]);
  await pool.end();
  for (const s of servers) s.close();
});

test('signed-out callers are refused', async () => {
  for (const path of ['/me', '/plans?from=2030-01-01&to=2030-01-02', '/friends']) {
    assert.equal((await call(null, 'GET', path)).status, 401);
  }
});

test('first call creates a profile, and it can be edited', async () => {
  for (const u of [ann, ben, sam]) assert.equal((await call(u, 'GET', '/me')).status, 200);
  const r = await call(ann, 'PATCH', '/me', {
    handle: `ann_${run}`, name: 'Ann', timezone: 'UTC', share_blocks: true, share_scores: true,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.handle, `ann_${run}`);
  assert.equal((await call(ann, 'PATCH', '/me', { handle: 'NO SPACES' })).status, 400);
});

test('plans: add, list, edit, in the Plan shape the app uses', async () => {
  const day = (h: number) => `2030-01-15T${String(h).padStart(2, '0')}:00:00Z`;
  const add = (title: string, h: number, extra: object) =>
    call(ann, 'POST', '/plans', { title, start: day(h), end: day(h + 1), ...extra });
  const lunch = await add('Lunch', 12, { kind: 'social', energyCost: 2, visibility: 'open', with: ['dani'] });
  assert.equal(lunch.status, 200);
  assert.deepEqual(
    { ...lunch.body, id: undefined, start: undefined, end: undefined },
    { id: undefined, title: 'Lunch', kind: 'social', start: undefined, end: undefined, energyCost: 2,
      status: 'accepted', shared: true, visibility: 'open', leaveBy: null, with: ['dani'], protected: false,
      source: 'capacity' },
  );
  const gym = await add('Gym', 9, { kind: 'enjoy', energyCost: 1.5, leaveBy: '8:30' });
  assert.equal(gym.body.visibility, 'busy', 'busy is the default');
  assert.equal(gym.body.energyCost, 1.5, 'costs keep tenths');
  assert.equal(gym.body.leaveBy, '8:30');
  await add('Doctor', 15, { kind: 'obligation', energyCost: 3.5, shared: false });

  const list = await call(ann, 'GET', '/plans?from=2030-01-15T00:00Z&to=2030-01-16T00:00Z');
  assert.deepEqual(list.body.map((e: any) => [e.title, e.shared]), [['Gym', true], ['Lunch', true], ['Doctor', false]]);

  const moved = await call(ann, 'PATCH', `/plans/${gym.body.id}`, { start: day(7), end: day(8), energyCost: 2.5, status: 'moved' });
  assert.equal(moved.body.energyCost, 2.5);
  assert.equal(moved.body.status, 'moved');
  assert.equal(new Date(moved.body.start).toISOString(), '2030-01-15T07:00:00.000Z');

  assert.equal((await call(ben, 'GET', `/plans/${gym.body.id}`)).status, 404, 'others cannot read it');
  assert.equal((await call(ann, 'POST', '/plans', { title: 'x' })).status, 400);
  assert.equal((await call(ann, 'PATCH', `/plans/${gym.body.id}`, { energyCost: 11 })).status, 400, 'over DAY_ROOM');
});

test('own day scores', async () => {
  const r = await call(ann, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`);
  assert.deepEqual(r.body, [{ day: '2030-01-15', load: 8, room: 10 }]);
});

test('friend flow: ask by handle, accept, then see blocks and scores', async () => {
  assert.equal((await call(ben, 'POST', '/friends', { handle: 'nobody_here' })).status, 404);
  assert.equal((await call(ben, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body.length, 0,
    'nothing before accepting');

  assert.equal((await call(ben, 'POST', '/friends', { handle: `@ANN_${run}` })).status, 200);
  assert.equal((await call(ben, 'POST', '/friends', { handle: `ann_${run}` })).status, 409);
  assert.equal((await call(ann, 'GET', '/friends')).body.incoming[0].id, ben);
  assert.equal((await call(ben, 'POST', `/friends/${ann}/accept`)).status, 404, 'requester cannot accept');
  assert.equal((await call(ann, 'POST', `/friends/${ben}/accept`)).status, 200);
  assert.equal((await call(ben, 'GET', '/friends')).body.friends[0].id, ann);

  const blocks = (await call(ben, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body;
  assert.deepEqual(blocks.map((b: any) => [b.title, b.category]), [
    [null, 'enjoy'],      // busy: category, no title
    ['Lunch', 'social'],  // open
    [null, null],         // private
  ]);
  const scores = (await call(ben, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`)).body;
  assert.equal(scores[0].load, 8);
  const days = (await call(ben, 'GET', `/friends/${ann}/days?from=2030-01-15&to=2030-01-16`)).body;
  assert.deepEqual(days, [
    { date: '2030-01-15', busy: true, load: 8, sharedPlanTitles: ['Lunch'] },
    { date: '2030-01-16', busy: false, load: 0 },
  ]);
});

test('stranger sees nothing, sharing switches turn things off', async () => {
  assert.equal((await call(sam, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body.length, 0);
  assert.equal((await call(sam, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`)).body.length, 0);
  assert.equal((await call(sam, 'GET', `/people/${ann}`)).body.name, 'Ann');
  assert.equal((await call(sam, 'GET', `/people/${ann}`)).body.timezone, undefined);

  await call(ann, 'PATCH', '/me', { share_blocks: false, share_scores: false });
  assert.equal((await call(ben, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body.length, 0);
  assert.equal((await call(ben, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`)).body.length, 0);

  assert.equal((await call(ben, 'DELETE', `/friends/${ann}`)).status, 200);
  assert.equal((await call(ann, 'GET', '/friends')).body.friends.length, 0);
});
