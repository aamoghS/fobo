// Google sign-in through the API (web, Expo Go, builds), against a fake Google. Needs TEST_DATABASE_URL.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../src/db.ts';
import { createHandler } from '../src/app.ts';

process.env.GOOGLE_WEB_CLIENT_ID = 'web-client';
process.env.GOOGLE_WEB_CLIENT_SECRET = 'web-secret';
process.env.AUTH_SECRET = 'test-auth-secret';
process.env.PUBLIC_API_URL = 'https://api.test';

const pool = createPool(process.env.TEST_DATABASE_URL);
const handle = createHandler(pool);
const sub = String(Date.now());
const userId = `g${sub}`;
const realFetch = globalThis.fetch;

const idToken = (claims: object) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`;
const req = (path: string, init?: RequestInit) => handle(new Request(`https://api.test${path}`, init));
const location = (res: Response) => new URL(res.headers.get('location')!.replace(/^(fobo|exp):\/\//, 'https://app/'));

before(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === 'https://oauth2.googleapis.com/token') {
      return Response.json({
        id_token: idToken({ sub, email: 'ann@x.com', name: 'Ann' }),
        refresh_token: 'refresh-1',
        scope: 'openid email https://www.googleapis.com/auth/calendar.events',
      });
    }
    if (String(input).startsWith('https://www.googleapis.com/calendar/')) return Response.json({ items: [], nextSyncToken: 't' });
    return realFetch(input, init);
  }) as typeof fetch;
});

after(async () => {
  globalThis.fetch = realFetch;
  await pool.query('delete from profiles where id = $1', [userId]);
  await pool.end();
});

test('start sends the browser to Google with Calendar access, and only back to the app', async () => {
  assert.equal((await req('/auth/google/start?return=https://evil.test/')).status, 400);
  const res = await req(`/auth/google/start?return=${encodeURIComponent('exp://10.0.0.5:8081/--/auth')}`);
  assert.equal(res.status, 302);
  const google = new URL(res.headers.get('location')!);
  assert.equal(google.searchParams.get('redirect_uri'), 'https://api.test/auth/google/callback');
  assert.match(google.searchParams.get('scope')!, /calendar\.events/);
  assert.equal(google.searchParams.get('access_type'), 'offline');
});

test('callback creates the profile, keeps Calendar access encrypted, and returns a working session', async () => {
  const state = new URL((await req('/auth/google/start?return=fobo%3A%2F%2Fauth')).headers.get('location')!)
    .searchParams.get('state')!;
  const res = await req(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`);
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location')!.startsWith('fobo://auth?session='));
  const session = location(res).searchParams.get('session')!;

  const me = await req('/me', { headers: { authorization: `Bearer ${session}` } });
  assert.equal(me.status, 200);
  assert.deepEqual((({ id, name }) => ({ id, name }))(await me.json()), { id: userId, name: 'Ann' });

  const stored = (await pool.query('select email, refresh_token from google_accounts where user_id = $1', [userId])).rows[0];
  assert.equal(stored.email, 'ann@x.com');
  assert.ok(!stored.refresh_token.toString().includes('refresh-1'), 'encrypted');
  const conns = (await pool.query('select account_email from calendar_connections where user_id = $1', [userId])).rows;
  assert.deepEqual(conns, [{ account_email: 'ann@x.com' }], 'calendar linked');

  // Signing in again keeps the same account.
  const again = await req(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`);
  assert.equal(again.status, 302);
  assert.equal((await pool.query('select count(*)::int as n from profiles where id = $1', [userId])).rows[0].n, 1);
});

test('a forged state or a cancelled sign-in signs no one in', async () => {
  const state = new URL((await req('/auth/google/start?return=fobo%3A%2F%2Fauth')).headers.get('location')!)
    .searchParams.get('state')!;
  const forged = Buffer.from(JSON.stringify({ r: 'fobo://evil', n: 'x', t: Date.now() })).toString('base64url');
  assert.equal((await req(`/auth/google/callback?code=abc&state=${forged}.${state.split('.')[1]}`)).status, 400);
  const cancelled = await req(`/auth/google/callback?error=access_denied&state=${encodeURIComponent(state)}`);
  assert.equal(cancelled.headers.get('location'), 'fobo://auth?error=access_denied');
  assert.equal((await req('/me', { headers: { authorization: 'Bearer not-a-session' } })).status, 401);
});
