// Sign-in. Google, for the web, Expo Go and app builds: the app opens /auth/google/start in a browser;
// the API runs Google's sign-in (with Calendar access), creates or finds the profile, keeps the
// Calendar token encrypted, and sends the browser back to the app with a session token.
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { issueSession } from '../auth.ts';
import { withService } from '../db.ts';
import { profiles } from '../schema.ts';
import { HttpError, json, readJson } from '../http.ts';
import { isTimezone } from './me.ts';
import { connect } from './google.ts';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/calendar.events'
  + ' https://www.googleapis.com/auth/calendar.calendarlist.readonly';

// Where the browser may be sent back to with a session: the app build (fobo://), the hosted web app
// (WEB_APP_ORIGINS), and for development, Expo Go on the tunnels of the Expo accounts in EXPO_GO_USERS or on
// a private network address, and local web pages. Anywhere else could be someone else's page or project.
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;
const list = (name: string) => (process.env[name] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function allowedReturn(returnTo: string) {
  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return false;
  }
  if (url.protocol === 'fobo:') return true;
  if (url.protocol === 'https:') return list('WEB_APP_ORIGINS').includes(url.origin);
  const devUsers = list('EXPO_GO_USERS');
  if (!devUsers.length) return false;
  if (url.protocol === 'http:') return PRIVATE_HOST.test(url.hostname);
  if (url.protocol !== 'exp:' && url.protocol !== 'exps:') return false;
  // Expo tunnels are <id>-<expo user>-<port>.exp.direct.
  const tunnelUser = url.hostname.match(/^[^.]+-([a-z0-9_-]+)-\d+\.exp\.direct$/i)?.[1]?.toLowerCase();
  return PRIVATE_HOST.test(url.hostname) || (!!tunnelUser && devUsers.map((u) => u.toLowerCase()).includes(tunnelUser));
}

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new HttpError(503, `${name} is not set`);
  return v;
};

// This API's own public address, as Google sees it (the Neon Function URL, or localhost in development).
function publicUrl(req: Request) {
  return (process.env.PUBLIC_API_URL ?? new URL(req.url).origin).replace(/\/$/, '');
}

// The state carries the app's return address through Google, signed so it cannot be swapped.
function sign(data: string) {
  return createHmac('sha256', env('GOOGLE_WEB_CLIENT_SECRET')).update(data).digest('base64url');
}
function packState(returnTo: string) {
  const data = Buffer.from(JSON.stringify({ r: returnTo, n: randomBytes(8).toString('hex'), t: Date.now() })).toString('base64url');
  return `${data}.${sign(data)}`;
}
function unpackState(state: string | null): string {
  const [data, mac] = (state ?? '').split('.');
  if (!data || !mac) throw new HttpError(400, 'bad state');
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(400, 'bad state');
  const { r, t } = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (Date.now() - t > 15 * 60_000) throw new HttpError(400, 'sign-in took too long; try again');
  return r;
}

function back(returnTo: string, params: Record<string, string>) {
  const url = `${returnTo}${returnTo.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;
  return new Response(null, { status: 302, headers: { Location: url } });
}

async function start(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return') ?? '';
  if (!allowedReturn(returnTo)) throw new HttpError(400, 'return must be the app');
  const q = new URLSearchParams({
    client_id: env('GOOGLE_WEB_CLIENT_ID'),
    redirect_uri: `${publicUrl(req)}/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: packState(returnTo),
  });
  return new Response(null, { status: 302, headers: { Location: `${GOOGLE_AUTH}?${q}` } });
}

async function callback(req: Request, pool: pg.Pool) {
  const url = new URL(req.url);
  const returnTo = unpackState(url.searchParams.get('state'));
  const code = url.searchParams.get('code');
  if (!code) return back(returnTo, { error: url.searchParams.get('error') ?? 'cancelled' });

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env('GOOGLE_WEB_CLIENT_ID'),
      client_secret: env('GOOGLE_WEB_CLIENT_SECRET'),
      redirect_uri: `${publicUrl(req)}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const google = (await tokenRes.json()) as { id_token?: string; refresh_token?: string; scope?: string };
  if (!tokenRes.ok || !google.id_token) return back(returnTo, { error: 'google' });

  // The ID token came straight from Google over TLS with our client secret, so its claims are trusted.
  const claims = JSON.parse(Buffer.from(google.id_token.split('.')[1], 'base64url').toString()) as {
    sub: string; email?: string; email_verified?: boolean; name?: string;
  };
  const userId = `g${claims.sub}`;
  // Only an address Google verified is kept: friends find each other by it.
  const email = claims.email_verified ? claims.email ?? '' : '';
  await withService(pool, async (db) => {
    await db.execute(sql`insert into profiles (id, name) values (${userId}, ${claims.name ?? null}) on conflict (id) do nothing`);
    await db.execute(sql`
      insert into google_accounts (user_id, google_sub, email, scope, refresh_token)
      values (${userId}, ${claims.sub}, ${email}, ${google.scope ?? ''},
              case when ${google.refresh_token ?? null}::text is null then null
                   else pgp_sym_encrypt(${google.refresh_token ?? ''}, ${env('AUTH_SECRET')}) end)
      on conflict (user_id) do update set email = excluded.email, scope = excluded.scope,
        refresh_token = coalesce(excluded.refresh_token, google_accounts.refresh_token)`);
  });
  if (google.refresh_token) {
    await withService(pool, (db) => connect(db, userId)).catch((e) => console.warn('calendar link failed', e));
  }
  return back(returnTo, { session: await issueSession(userId) });
}

// Email sign-up and log-in. The password is hashed with bcrypt in the database; the answer is a session token.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signUp(req: Request, pool: pg.Pool) {
  const body = await readJson(req);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim() || null;
  const timezone = isTimezone(body.timezone) ? body.timezone : null;
  if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email');
  if (password.length < 8) throw new HttpError(400, 'Use at least 8 characters for your password');
  const userId = `e${randomUUID().replaceAll('-', '')}`;
  await withService(pool, async (db) => {
    const taken = await db.execute(sql`select 1 from email_accounts where email = ${email}`);
    if (taken.rows.length) throw new HttpError(409, 'An account with that email already exists');
    await db.insert(profiles).values({ id: userId, name, ...(timezone ? { timezone } : {}) });
    await db.execute(sql`insert into email_accounts (user_id, email, password_hash)
                         values (${userId}, ${email}, crypt(${password}, gen_salt('bf', 10)))`);
  });
  return json(200, { session: await issueSession(userId) });
}

async function logIn(req: Request, pool: pg.Pool) {
  const body = await readJson(req);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const userId = await withService(pool, async (db) => {
    const { rows } = await db.execute<{ user_id: string }>(sql`
      select user_id from email_accounts where email = ${email} and password_hash = crypt(${password}, password_hash)`);
    return rows[0]?.user_id;
  });
  if (!userId) throw new HttpError(401, 'Wrong email or password');
  return json(200, { session: await issueSession(userId) });
}

// Routes that run before anyone is signed in. They return their own responses.
export const publicRoutes: { method: string; path: string; run: (req: Request, pool: pg.Pool) => Promise<Response> }[] = [
  { method: 'GET', path: '/auth/google/start', run: start },
  { method: 'GET', path: '/auth/google/callback', run: callback },
  { method: 'POST', path: '/auth/email/signup', run: signUp },
  { method: 'POST', path: '/auth/email/login', run: logIn },
];
