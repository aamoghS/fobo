// Planner checks and the fix-calendar / apply-fix flow, with a fake planner in place of Gemini.
// The flow tests need TEST_DATABASE_URL (throwaway database).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createPool, upsertProfile, withUser } from '../src/db.ts';
import { allowedChanges, checkAnswer, scoreDays, type Answer, type PlanRow } from '../src/planner.ts';
import { createServer } from '../src/server.ts';
import { dayLoads, localIso } from '../src/time.ts';

const plan = (id: string, start: string, cost: number, extra: Partial<PlanRow> = {}): PlanRow => ({
  id, starts_at: start, ends_at: start, cost, category: 'work', protected: false, declined: false,
  with_people: [], ...extra,
});

test('localIso keeps the wall-clock time and offset', () => {
  assert.equal(localIso(new Date('2030-01-15T23:30:00Z'), 'America/New_York'), '2030-01-15T18:30-05:00');
  assert.equal(localIso(new Date('2030-01-15T23:30:00Z'), 'UTC'), '2030-01-15T23:30+00:00');
});

test('dayLoads groups by local day, skips declined, never below 0', () => {
  const loads = dayLoads([
    { starts_at: '2030-01-16T02:00:00Z', cost: 4 },               // still the 15th in New York
    { starts_at: '2030-01-15T15:00:00Z', cost: 3 },
    { starts_at: '2030-01-15T16:00:00Z', cost: 5, declined: true },
    { starts_at: '2030-01-17T15:00:00Z', cost: -1 },
  ], 'America/New_York');
  assert.deepEqual(loads, { '2030-01-15': 7, '2030-01-17': 0 });
});

test('allowedChanges drops unsafe changes', () => {
  const plans = [
    plan('solo', '2030-01-15T09:00Z', 3),
    plan('group', '2030-01-15T12:00Z', 3, { with_people: ['Bea'] }),
    plan('locked', '2030-01-15T15:00Z', 3, { protected: true }),
  ];
  const base = { starts_at: null, ends_at: null, title: null, reason: 'r' };
  const kept = allowedChanges([
    { ...base, op: 'move', event_id: 'solo', starts_at: 'a', ends_at: 'b' },
    { ...base, op: 'move', event_id: 'group', starts_at: 'a', ends_at: 'b' },  // has people
    { ...base, op: 'shorten', event_id: 'group', ends_at: 'b' },
    { ...base, op: 'decline', event_id: 'locked' },                          // protected
    { ...base, op: 'decline', event_id: 'unknown' },                         // not sent
    { ...base, op: 'shorten', event_id: 'solo' },                            // no end time
    { ...base, op: 'add_rest', event_id: null, starts_at: 'a', ends_at: 'b', title: 'Rest' },
    { ...base, op: 'add_rest', event_id: null, starts_at: 'a', ends_at: 'b' }, // no title
  ], plans);
  assert.deepEqual(kept.map((c) => `${c.op}:${c.event_id}`), ['move:solo', 'shorten:group', 'add_rest:null']);
});

test('scoreDays computes before and after', () => {
  const plans = [plan('a', '2030-01-15T09:00Z', 6), plan('b', '2030-01-15T12:00Z', 6)];
  const days = scoreDays(plans, [
    { op: 'move', event_id: 'b', starts_at: '2030-01-16T12:00Z', ends_at: '2030-01-16T13:00Z', title: null, reason: '' },
  ], 'UTC');
  assert.deepEqual(days, [
    { date: '2030-01-15', before: 12, after: 6, room: 10 },
    { date: '2030-01-16', before: 0, after: 6, room: 10 },
  ]);
});

test('checkAnswer rejects a bad shape', () => {
  assert.throws(() => checkAnswer({ summary: 'x', classify: [], changes: [{ op: 'explode', reason: '' }] }));
  assert.doesNotThrow(() => checkAnswer({ summary: 'x', classify: [], changes: [] }));
});

// ---------------------------------------------------------------- flow

const pool = createPool(process.env.TEST_DATABASE_URL);
const me = `pln${Date.now().toString(36)}`;
const servers: http.Server[] = [];
let base = '';
let sign: () => Promise<string>;
let answer: (input: any) => Answer;
let sent: any;

function listen(s: http.Server): Promise<string> {
  servers.push(s);
  return new Promise((ok) => s.listen(0, () => ok(`http://localhost:${(s.address() as AddressInfo).port}`)));
}

async function post(path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${await sign()}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const hours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();
let ids: Record<string, string> = {};
let fixId = '';

before(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'k' };
  process.env.NEON_AUTH_JWKS_URL = await listen(http.createServer((_, r) => r.end(JSON.stringify({ keys: [jwk] }))));
  sign = () => new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k' }).setSubject(me)
    .setExpirationTime('5m').sign(privateKey);
  base = await listen(createServer(pool, async (input) => ((sent = input), answer(input))));

  await withUser(pool, { sub: me }, async (c) => {
    await upsertProfile(c, me);
    for (const [title, h, cost, extra] of [
      ['Gym', 24, 3, {}], ['Dinner', 26, 5, { with_people: ['Bea'] }], ['Focus', 28, 4, { protected: true }],
      ['Mystery', 30, null, {}],
    ] as const) {
      const r = await c.$client.query(
        `insert into events (user_id, title, time, cost, category, protected, with_people)
         values ($1, $2, tstzrange($3, $4), coalesce($5, 0), $6, $7, $8) returning id`,
        [me, title, hours(h), hours(h + 1), cost, cost === null ? null : 'work',
          (extra as any).protected ?? false, (extra as any).with_people ?? []],
      );
      ids[title] = r.rows[0].id;
    }
  });
});

after(async () => {
  await pool.query('delete from profiles where id = $1', [me]);
  await pool.end();
  for (const s of servers) s.close();
});

test('fix-calendar sends plans, saves classifications, keeps only allowed changes', async () => {
  answer = () => ({
    summary: 'Tomorrow is heavy. Shorten dinner and add a rest.',
    classify: [{ event_id: ids.Mystery, category: 'social', cost: 12 }],
    changes: [
      { op: 'shorten', event_id: ids.Dinner, starts_at: null, ends_at: hours(26.5), title: null, reason: 'Leave early.' },
      { op: 'move', event_id: ids.Dinner, starts_at: hours(40), ends_at: hours(41), title: null, reason: 'x' },
      { op: 'decline', event_id: ids.Focus, starts_at: null, ends_at: null, title: null, reason: 'x' },
      { op: 'decline', event_id: ids.Gym, starts_at: null, ends_at: null, title: null, reason: 'Skip it.' },
      { op: 'add_rest', event_id: null, starts_at: hours(32), ends_at: hours(33), title: 'Rest', reason: 'Breathe.' },
    ],
  });
  const r = await post('/fix-calendar', { days: 3 });
  assert.equal(r.status, 200);
  assert.equal(sent.plans.length, 4);
  assert.equal(sent.plans.find((p: any) => p.title === 'Mystery').cost, null);
  assert.deepEqual(r.body.changes.map((c: any) => c.op), ['shorten', 'decline', 'add_rest']);
  assert.equal(r.body.status, 'proposed');
  assert.ok(r.body.days.length >= 1);

  const mystery = (await pool.query('select category, cost from events where id = $1', [ids.Mystery])).rows[0];
  assert.deepEqual(mystery, { category: 'social', cost: 10 }, 'classified, cost clamped to DAY_ROOM');
  fixId = r.body.id;
});

test('apply-fix applies only the picked changes, once', async () => {
  const r = await post('/apply-fix', { fixId: fixId, only: [1, 2] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.results.map((x: any) => [x.op, x.local]), [['decline', 'updated'], ['add_rest', 'added']]);
  const rows = (await pool.query(
    'select title, declined, protected, cost from events where user_id = $1 order by lower(time)', [me],
  )).rows;
  assert.equal(rows.find((x) => x.title === 'Gym').declined, true);
  assert.equal(rows.find((x) => x.title === 'Dinner').declined, false, 'unpicked change not applied');
  assert.deepEqual(rows.find((x) => x.title === 'Rest'), { title: 'Rest', declined: false, protected: true, cost: -1 });
  assert.equal((await post('/apply-fix', { fixId: fixId })).status, 404, 'cannot apply twice');
});

test('a planner refusal is reported, and no key means not set up', async () => {
  answer = () => checkAnswer({ nope: true });
  assert.equal((await post('/fix-calendar', {})).status, 422);

  const plain = await listen(createServer(pool));
  delete process.env.GEMINI_API_KEY;
  const res = await fetch(`${plain}/fix-calendar`, {
    method: 'POST', headers: { authorization: `Bearer ${await sign()}` }, body: '{}',
  });
  assert.equal(res.status, 503);
});
