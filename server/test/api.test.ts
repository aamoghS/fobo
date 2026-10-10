// HTTP-level API test. Signs its own Ed25519 tokens, as Neon Auth does, and serves them from a local JWKS, so it needs only
// TEST_DATABASE_URL (a throwaway database with db/migrations applied). Never point it at production.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createPool } from '../src/db.ts';
import { createServer } from '../src/server.ts';
import { clock, when } from '../src/time.ts';

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
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  const jwk = { ...(await exportJWK(publicKey)), alg: 'EdDSA', kid: 'test' };
  const jwksUrl = await listen(http.createServer((_, res) => res.end(JSON.stringify({ keys: [jwk] }))));
  process.env.NEON_AUTH_JWKS_URL = jwksUrl;
  sign = (sub) => new SignJWT({}).setProtectedHeader({ alg: 'EdDSA', kid: 'test' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  base = await listen(createServer(pool));
});

after(async () => {
  await pool.query('delete from profiles where id = any($1)', [[ann, ben, sam]]);
  await pool.end();
  for (const s of servers) s.close();
});

test('display strings match the app', () => {
  assert.equal(clock('2026-10-10T16:00'), '4:00');
  assert.equal(clock('2026-10-10T00:30'), '12:30');
  assert.equal(when('2026-10-08T11:30', '2026-10-07'), 'Tomorrow 11:30');
  assert.equal(when('2026-10-10T19:00', '2026-10-07'), 'Saturday 7:00');
});

test('signed-out callers are refused', async () => {
  for (const path of ['/me', '/plans?from=2030-01-01&to=2030-01-02', '/friends']) {
    assert.equal((await call(null, 'GET', path)).status, 401);
  }
});

test('first call creates a profile, and it can be edited', async () => {
  for (const u of [ann, ben, sam]) assert.equal((await call(u, 'GET', '/me')).status, 200);
  const r = await call(ann, 'PATCH', '/me', {
    handle: `ann_${run}`, name: 'Ann', timezone: 'UTC', shareBlocks: true, shareScores: true,
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
      source: 'capacity', costNote: null, exitNote: null, reminder: null, detail: {} },
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
  assert.equal(moved.body.start, '2030-01-15T07:00', 'local wall-clock, as the app writes it');

  assert.equal((await call(ben, 'GET', `/plans/${gym.body.id}`)).status, 404, 'others cannot read it');
  assert.equal((await call(ann, 'POST', '/plans', { title: 'x' })).status, 400);
  assert.equal((await call(ann, 'PATCH', `/plans/${gym.body.id}`, { energyCost: 11 })).status, 400, 'over DAY_ROOM');
});

test('own day scores', async () => {
  const r = await call(ann, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`);
  assert.deepEqual(r.body, [{ day: '2030-01-15', load: 8, room: 10 }]);
});

test('times are local wall-clock, in and out', async () => {
  await call(ann, 'PATCH', '/me', { timezone: 'America/New_York' });
  const r = await call(ann, 'POST', '/plans', { title: 'Late call', start: '2030-01-20T21:00', end: '2030-01-20T22:00' });
  assert.equal(r.body.start, '2030-01-20T21:00');
  const utc = await call(ann, 'POST', '/plans', { title: 'Zulu', start: '2030-01-21T02:00Z', end: '2030-01-21T03:00Z' });
  assert.equal(utc.body.start, '2030-01-20T21:00', 'an instant with Z is shown in local time');
  await call(ann, 'PATCH', '/me', { timezone: 'UTC' });
});

test('plan detail notes, as PlanDetail', async () => {
  const r = await call(ann, 'POST', '/plans', {
    title: 'Hackathon', start: '2030-01-22T07:00', end: '2030-01-22T11:00', kind: 'work', energyCost: 6,
    leaveBy: '10:30', exitNote: 'Keeps the afternoon free', costNote: 'Loud room, early start', reminder: '30 minutes before',
  });
  assert.deepEqual(r.body.detail, {
    costNote: 'Loud room, early start',
    exit: { leaveBy: '10:30', note: 'Keeps the afternoon free' },
    reminder: '30 minutes before',
  });
});

test('profile: character and onboarding must be options the app offers', async () => {
  const ok = await call(ann, 'PATCH', '/me', {
    character: { shape: 'slab', color: 'moodStretched', eyes: 'bored', height: 0.2 },
    onboarding: { recharge: 'alone', yourself: 'Next morning' }, bio: 'Slow mornings', tint: 'tintSky',
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.email, null, 'no Neon Auth in tests');
  assert.equal((await call(ann, 'PATCH', '/me', { character: { shape: 'blob', color: 'moodFine', eyes: 'happy', height: 0.5 } })).status, 400);
  assert.equal((await call(ann, 'PATCH', '/me', { onboarding: { recharge: 'sometimes' } })).status, 400);
  assert.equal((await call(ann, 'PATCH', '/me', { tint: 'red' })).status, 400);
});

test('week summary: personal hours, up next, day loads', async () => {
  const w = await call(ann, 'GET', '/week?start=2030-01-14');
  assert.equal(w.body.end, '2030-01-20');
  assert.equal(w.body.personalHours, 1, 'the Gym plan (enjoy) is one hour');
  assert.equal(w.body.days.length, 7);
  assert.equal(w.body.days.find((d: any) => d.date === '2030-01-15').load, 8);
  assert.ok(w.body.upNext && typeof w.body.upNext.start === 'string');
  assert.equal((await call(ann, 'GET', '/week')).status, 400);
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
  const benFriends = (await call(ben, 'GET', '/friends')).body.friends;
  assert.equal(benFriends[0].id, ann);
  assert.equal(benFriends[0].tint, 'tintSky');
  assert.deepEqual([benFriends[0].nextPlan, benFriends[0].pastTogether], [null, 0]);

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

test('People and You tab come back in the mock data shapes', async () => {
  await call(ann, 'POST', '/plans', { title: 'Dinner', start: '2099-06-06T19:00', end: '2099-06-06T21:00', with: [ben] });
  await call(ann, 'POST', '/plans', { title: 'Brunch', start: '2000-01-01T11:00', end: '2000-01-01T12:00', with: [ben] });
  await call(ben, 'PATCH', '/me', { name: 'Ben', bio: 'Always up for a slow morning.', tint: 'tintRose' });
  const people = (await call(ann, 'GET', '/people')).body;
  assert.deepEqual(people, [{
    id: ben, name: 'Ben', tint: 'tintRose', nextLabel: 'Dinner · Saturday',
    bio: 'Always up for a slow morning.', pastTogether: 1,
  }]);

  await call(ann, 'PATCH', '/me', {
    onboarding: { recharge: 'depends', 'head-home': 'After 2 to 3 hours', yourself: '2 to 3 days' },
    busyStreak: 2, protectedHours: 2, stressRelief: ['painting', 'jogging', 'sleeping'],
  });
  const you = (await call(ann, 'GET', '/profile')).body;
  assert.deepEqual(Object.keys(you).sort(), ['achievements', 'capacity', 'profile', 'widget']);
  assert.equal(you.profile.title, 'Social Butterfly');
  assert.deepEqual(Object.keys(you.profile.streak).sort(), ['days', 'detail', 'of', 'title']);
  assert.equal(you.profile.streak.of, 7);
  assert.deepEqual(you.capacity, [
    { label: 'How you recharge', value: 'Recharges both ways', step: 'recharge' },
    { label: 'Social energy', value: 'Fades after ~3 hrs', step: 'head-home' },
    { label: 'Alone time', value: '2 hours needed' },
    { label: 'Busy days', value: '2 busy days in a row is fine' },
    { label: 'Recovery', value: '3 days recovery needed', step: 'yourself' },
    { label: 'Stress-relief', value: 'Painting, jogging, sleeping' },
  ]);
  assert.deepEqual(Object.keys(you.widget).sort(), ['headline', 'label', 'next', 'nudge']);
  assert.equal(you.widget.label, 'Today');
  assert.deepEqual(you.achievements, [], 'nothing earned on day one');
});
test('stranger sees nothing, sharing switches turn things off', async () => {
  assert.equal((await call(sam, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body.length, 0);
  assert.equal((await call(sam, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`)).body.length, 0);
  assert.equal((await call(sam, 'GET', `/people/${ann}`)).body.name, 'Ann');
  assert.equal((await call(sam, 'GET', `/people/${ann}`)).body.timezone, undefined);

  await call(ann, 'PATCH', '/me', { shareBlocks: false, shareScores: false });
  assert.equal((await call(ben, 'GET', `/friends/${ann}/blocks?date=2030-01-15`)).body.length, 0);
  assert.equal((await call(ben, 'GET', `/scores/${ann}?from=2030-01-15&to=2030-01-15`)).body.length, 0);

  assert.equal((await call(ben, 'DELETE', `/friends/${ann}`)).status, 200);
  assert.equal((await call(ann, 'GET', '/friends')).body.friends.length, 0);
});
