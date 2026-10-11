// Sign-in. Google, for the web, Expo Go and app builds: the app opens /auth/google/start in a browser;
// the API runs Google's sign-in (with Calendar access), creates or finds the profile, keeps the
// Calendar token encrypted, and sends the browser back to the app with a session token.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { issueSession, verify } from '../auth.ts';
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

// The state carries the app's return address through Google, and for linking, who is signed in; it is
// signed so neither can be swapped.
function sign(data: string) {
  return createHmac('sha256', env('GOOGLE_WEB_CLIENT_SECRET')).update(data).digest('base64url');
}
function packState(returnTo: string, linkTo?: string, challenge?: string) {
  const data = Buffer.from(JSON.stringify({ r: returnTo, u: linkTo, c: challenge, n: randomBytes(8).toString('hex'), t: Date.now() })).toString('base64url');
  return `${data}.${sign(data)}`;
}
function unpackState(state: string | null): { r: string; u?: string; c?: string } {
  const [data, mac] = (state ?? '').split('.');
  if (!data || !mac) throw new HttpError(400, 'bad state');
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(400, 'bad state');
  const { r, u, c, t } = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (Date.now() - t > 15 * 60_000) throw new HttpError(400, 'sign-in took too long; try again');
  return { r, u: typeof u === 'string' ? u : undefined, c: typeof c === 'string' ? c : undefined };
}

// Linking hands the app a key that never passes through the browser, and Google's answer comes back as a
// sealed ticket that only links when the signed-in app brings both. Whoever finishes Google's sign-in gets
// only the ticket, so a link started by one person and opened by another links nothing.
const hash = (s: string) => createHash('sha256').update(s).digest('base64url');
const ticketKey = () => createHash('sha256').update(`link:${env('AUTH_SECRET')}`).digest();

function sealTicket(payload: object) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ticketKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ ...payload, t: Date.now() })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
function openTicket(ticket: string): Record<string, unknown> {
  try {
    const raw = Buffer.from(ticket, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', ticketKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString());
    if (Date.now() - data.t > 10 * 60_000) throw new Error('expired');
    return data;
  } catch {
    throw new HttpError(400, 'Linking Google took too long. Try again.');
  }
}

function back(returnTo: string, params: Record<string, string>) {
  const url = `${returnTo}${returnTo.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;
  return new Response(null, { status: 302, headers: { Location: url } });
}

function googleSignIn(req: Request, state: string) {
  const q = new URLSearchParams({
    client_id: env('GOOGLE_WEB_CLIENT_ID'),
    redirect_uri: `${publicUrl(req)}/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTH}?${q}`;
}

async function start(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return') ?? '';
  if (!allowedReturn(returnTo)) throw new HttpError(400, 'return must be the app');
  return new Response(null, { status: 302, headers: { Location: googleSignIn(req, packState(returnTo)) } });
}

// Connect Google Calendar to the account already signed in (an email sign-up): answers { url, key }:
// Google's sign-in for the app to open, and the key the app keeps. Back from Google, the app gets
// `link` (a ticket) or `error`, and sends the ticket with its key to /auth/google/link/finish.
async function link(req: Request) {
  const claims = await verify(req.headers.get('authorization') ?? undefined);
  if (!claims) return json(401, { error: 'not signed in' });
  const returnTo = String((await readJson(req)).returnTo ?? '');
  if (!allowedReturn(returnTo)) throw new HttpError(400, 'return must be the app');
  const key = randomBytes(24).toString('base64url');
  return json(200, { url: googleSignIn(req, packState(returnTo, claims.sub, hash(key))), key });
}

type GoogleTokens = { refresh_token?: string; scope?: string };
type GoogleId = { sub: string; email?: string; email_verified?: boolean; name?: string };

// Keeps the Google account (and its Calendar token, encrypted) on a Fobo account: the one being linked,
// else the one this Google account already opens, else a new one. Null when linking a Google account
// that belongs to someone else.
async function saveGoogle(pool: pg.Pool, linkTo: string | undefined, google: GoogleTokens, claims: GoogleId) {
  // Only an address Google verified is kept: friends find each other by it.
  const email = claims.email_verified ? claims.email ?? '' : '';
  const userId = await withService(pool, async (db) => {
    // A Google account belongs to one Fobo account: signing in with it opens that account (one it was
    // linked to, too), and it can't be linked to a second.
    const owner = (await db.execute<{ user_id: string }>(sql`select user_id from google_accounts where google_sub = ${claims.sub}`)).rows[0]?.user_id;
    if (linkTo && owner && owner !== linkTo) return null;
    const userId = linkTo ?? owner ?? `g${claims.sub}`;
    if (!linkTo) await db.execute(sql`insert into profiles (id, name) values (${userId}, ${claims.name ?? null}) on conflict (id) do nothing`);
    await db.execute(sql`
      insert into google_accounts (user_id, google_sub, email, scope, refresh_token)
      values (${userId}, ${claims.sub}, ${email}, ${google.scope ?? ''},
              case when ${google.refresh_token ?? null}::text is null then null
                   else pgp_sym_encrypt(${google.refresh_token ?? ''}, ${env('AUTH_SECRET')}) end)
      on conflict (user_id) do update set google_sub = excluded.google_sub, email = excluded.email, scope = excluded.scope,
        refresh_token = coalesce(excluded.refresh_token, google_accounts.refresh_token)`);
    return userId;
  });
  if (userId && google.refresh_token) {
    await withService(pool, (db) => connect(db, userId)).catch((e) => console.warn('calendar link failed', e));
  }
  return userId;
}

// The second half of linking: the signed-in app brings the ticket and the key it was given.
async function finishLink(req: Request, pool: pg.Pool) {
  const claims = await verify(req.headers.get('authorization') ?? undefined);
  if (!claims) return json(401, { error: 'not signed in' });
  const body = await readJson(req);
  const ticket = openTicket(String(body.ticket ?? ''));
  const a = Buffer.from(hash(String(body.key ?? '')));
  const b = Buffer.from(String(ticket.c ?? ''));
  if (ticket.u !== claims.sub || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new HttpError(403, 'That Google sign-in was started by someone else.');
  }
  const userId = await saveGoogle(pool, claims.sub, ticket.g as GoogleTokens, ticket.id as GoogleId);
  if (!userId) return json(409, { error: 'google-taken' });
  return json(200, { linked: true });
}

async function callback(req: Request, pool: pg.Pool) {
  const url = new URL(req.url);
  const { r: returnTo, u: linkTo, c: challenge } = unpackState(url.searchParams.get('state'));
  const code = url.searchParams.get('code');
  if (!code) return back(returnTo, { error: url.searchParams.get('error') ?? 'cancelled' });
  if (linkTo && !challenge) return back(returnTo, { error: 'link' });

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
  const google = (await tokenRes.json()) as GoogleTokens & { id_token?: string };
  if (!tokenRes.ok || !google.id_token) return back(returnTo, { error: 'google' });

  // The ID token came straight from Google over TLS with our client secret, so its claims are trusted.
  const claims = JSON.parse(Buffer.from(google.id_token.split('.')[1], 'base64url').toString()) as GoogleId;
  const tokens = { refresh_token: google.refresh_token, scope: google.scope };
  if (linkTo) {
    const id = { sub: claims.sub, email: claims.email, email_verified: claims.email_verified, name: claims.name };
    return back(returnTo, { link: sealTicket({ u: linkTo, c: challenge, g: tokens, id }) });
  }
  const userId = await saveGoogle(pool, undefined, tokens, claims);
  return back(returnTo, { session: await issueSession(userId!) });
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
  { method: 'POST', path: '/auth/google/link', run: link },
  { method: 'POST', path: '/auth/google/link/finish', run: finishLink },
  { method: 'POST', path: '/auth/email/signup', run: signUp },
  { method: 'POST', path: '/auth/email/login', run: logIn },
];
