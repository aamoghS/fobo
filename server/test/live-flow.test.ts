// The app's startup load (src/data/live.ts) against the API: the same calls in the same order,
// checked against the shapes the screens read from src/data/*.ts. Needs TEST_DATABASE_URL.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createPool } from '../src/db.ts';
import { createServer } from '../src/server.ts';

const pool = createPool(process.env.TEST_DATABASE_URL);
const me = `live${Date.now().toString(36)}`;
const servers: http.Server[] = [];
let base = '';
let token = '';

const listen = (s: http.Server) => new Promise<string>((ok) => {
  servers.push(s);
  s.listen(0, () => ok(`http://localhost:${(s.address() as AddressInfo).port}`));
});
const get = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(res.status, 200, `${method} ${path}`);
  return res.json() as Promise<any>;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

before(async () => {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  const jwk = { ...(await exportJWK(publicKey)), alg: 'EdDSA', kid: 'k' };
  process.env.NEON_AUTH_JWKS_URL = await listen(http.createServer((_, r) => r.end(JSON.stringify({ keys: [jwk] }))));
  token = await new SignJWT({}).setProtectedHeader({ alg: 'EdDSA', kid: 'k' }).setSubject(me)
    .setExpirationTime('5m').sign(privateKey);
  base = await listen(createServer(pool));
});

after(async () => {
  await pool.query('delete from profiles where id = $1', [me]);
  await pool.end();
  for (const s of servers) s.close();
});

test('a new user: sign-in, onboarding, then the startup load', async () => {
  const first = await get('GET', '/me');
  assert.equal(first.id, me);
  await get('PATCH', '/me', {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    onboarding: { recharge: 'depends', 'head-home': 'After 2 to 3 hours', yourself: 'Next morning' },
  });
  await get('PATCH', '/me', { character: { shape: 'slab', color: 'moodStretched', eyes: 'bored', height: 0.2 } });

  // A plan later today, as the Plans screen would add one.
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 36e5);
  const start = `${localDay(later)}T${pad(later.getHours())}:00`;
  const end = `${localDay(later)}T${pad(later.getHours())}:30`;
  await get('POST', '/plans', { title: 'Coffee', kind: 'social', start, end, energyCost: 2.5 });

  // src/data/live.ts, in order.
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const next = new Date(monday);
  next.setDate(monday.getDate() + 7);
  const meAgain = await get('GET', '/me');
  const [w, list, circle, you] = await Promise.all([
    get('GET', `/week?start=${localDay(monday)}`),
    get('GET', `/plans?from=${localDay(monday)}T00:00&to=${localDay(next)}T00:00`),
    get('GET', '/people'),
    get('GET', '/profile'),
  ]);

  assert.deepEqual(meAgain.character, { shape: 'slab', color: 'moodStretched', eyes: 'bored', height: 0.2 });
  // src/data/week.ts
  assert.equal(w.start, localDay(monday));
  assert.match(w.end, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof w.personalHours, 'number');
  assert.equal(w.upNext?.title, 'Coffee');
  assert.match(w.upNext.when, /^(Today|Tomorrow|\w+day) \d{1,2}:\d{2}$/);
  // src/features/plans/types.ts Plan
  const coffee = list.find((p: any) => p.title === 'Coffee');
  for (const [k, t] of Object.entries({ id: 'string', title: 'string', kind: 'string', start: 'string', end: 'string', energyCost: 'number', status: 'string', shared: 'boolean' })) {
    assert.equal(typeof coffee[k], t, `Plan.${k}`);
  }
  assert.equal(coffee.start, start, 'local wall-clock, comparable with NOW');
  // src/data/people.ts
  assert.deepEqual(circle, []);
  // src/data/profile.ts
  assert.equal(you.profile.title, 'Social Butterfly');
  assert.equal(you.profile.streak.of, 7);
  assert.ok(Array.isArray(you.achievements));
  assert.equal(you.widget.label, 'Today');
  assert.equal(you.widget.next, `${(later.getHours() % 12) || 12}:00 Coffee`);
  assert.deepEqual(you.capacity.map((r: any) => r.label), ['How you recharge', 'Social energy', 'Recovery']);
});
