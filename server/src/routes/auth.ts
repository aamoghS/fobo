// Google sign-in for the web, Expo Go and app builds. The app opens /auth/google/start in a browser;
// the API runs Google's sign-in (with Calendar access), creates or finds the profile, keeps the
// Calendar token encrypted, and sends the browser back to the app with a session token.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { issueSession } from '../auth.ts';
import { withService } from '../db.ts';
import { HttpError } from '../http.ts';
import { connect } from './google.ts';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/calendar.events'
  + ' https://www.googleapis.com/auth/calendar.calendarlist.readonly';

// Where the browser may be sent back to: the app (Expo Go's exp://, the build's fobo://) or a local web page.
const APP_RETURN = /^(exp|exps|fobo):\/\/|^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?\//;

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
  if (!APP_RETURN.test(returnTo)) throw new HttpError(400, 'return must be the app');
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
    sub: string; email?: string; name?: string;
  };
  const userId = `g${claims.sub}`;
  await withService(pool, async (db) => {
    await db.execute(sql`insert into profiles (id, name) values (${userId}, ${claims.name ?? null}) on conflict (id) do nothing`);
    await db.execute(sql`
      insert into google_accounts (user_id, google_sub, email, scope, refresh_token)
      values (${userId}, ${claims.sub}, ${claims.email ?? ''}, ${google.scope ?? ''},
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

// Routes that run before anyone is signed in. They return their own responses (redirects).
export const publicRoutes: { method: string; path: string; run: (req: Request, pool: pg.Pool) => Promise<Response> }[] = [
  { method: 'GET', path: '/auth/google/start', run: start },
  { method: 'GET', path: '/auth/google/callback', run: callback },
];
