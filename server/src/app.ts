// The Fobo API as a fetch handler: a Request in, a Response out. Deployed as a Neon Function
// (functions/api.ts); server.ts serves the same handler with Node for local runs and tests.
// Every request (except the sign-in routes) is verified against Neon Auth, then runs in one transaction.
import type pg from 'pg';
import { verify } from './auth.ts';
import { createPool } from './db.ts';
import { HttpError, cached, json, readJson, type Route } from './http.ts';
import { publicRoutes } from './routes/auth.ts';
import { pageRoutes } from './routes/pages.ts';
import { eventRoutes } from './routes/events.ts';
import { fixRoutes } from './routes/fix.ts';
import { friendRoutes } from './routes/friends.ts';
import { googleRoutes } from './routes/google.ts';
import { invitePage, inviteRoutes } from './routes/invite.ts';
import { meRoutes } from './routes/me.ts';
import { weekRoutes } from './routes/week.ts';
import { weighRoutes } from './routes/weigh.ts';
import { youRoutes } from './routes/you.ts';

export function createHandler(pool: pg.Pool = createPool()) {
  const routes: Route[] = [...meRoutes, ...youRoutes, ...weekRoutes, ...eventRoutes, ...friendRoutes, ...googleRoutes, ...fixRoutes, ...weighRoutes, ...inviteRoutes];
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method === 'OPTIONS') return json(204);
      const url = new URL(req.url);
      // Sign-in routes run before anyone is signed in.
      const open = publicRoutes.find((x) => x.method === req.method && x.path === url.pathname);
      if (open) return await open.run(req, pool);
      const pageRoute = pageRoutes.find((x) => x.method === req.method && x.path === url.pathname);
      if (pageRoute) return await pageRoute.run();
      if (req.method === 'GET' && url.pathname.startsWith('/invite/')) return await invitePage(url.pathname.slice('/invite/'.length), pool);
      let match: RegExpExecArray | null = null;
      const r = routes.find((x) => x.method === req.method && (match = x.pattern.exec(url.pathname)));
      if (!r || !match) return json(404, { error: 'not found' });
      const claims = await verify(req.headers.get('authorization') ?? undefined);
      if (!claims) return json(401, { error: 'not signed in' });
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match![i + 1])]));
      const body = req.method === 'GET' ? {} : await readJson(req);
      const out = await r.handler({ pool, claims, params, query: url.searchParams, body });
      return req.method === 'GET' ? cached(req, out ?? null) : json(200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      // Postgres integrity and input errors (bad handle, taken handle, bad date) are the caller's.
      // Drizzle wraps the driver's error; the Postgres code is on the cause.
      const err = e as { code?: string; cause?: { code?: string } };
      const code = err.code ?? err.cause?.code ?? '';
      if (code.startsWith('23') || code.startsWith('22')) return json(400, { error: 'invalid input' });
      console.error(e);
      return json(500, { error: 'server error' });
    }
  };
}
