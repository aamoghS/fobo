// Fobo API server. Every request is verified against Neon Auth, then runs in one transaction.
//   npm run dev   (from server/, loads ../.env.local)
import http from 'node:http';
import { verify } from './auth.ts';
import { createPool } from './db.ts';
import { HttpError, readJson, send, type Route } from './http.ts';
import { eventRoutes } from './routes/events.ts';
import { meRoutes } from './routes/me.ts';

export const routes: Route[] = [...meRoutes, ...eventRoutes];

export function createServer(pool = createPool()) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, undefined);
      const url = new URL(req.url ?? '/', 'http://localhost');
      let match: RegExpExecArray | null = null;
      const r = routes.find((x) => x.method === req.method && (match = x.pattern.exec(url.pathname)));
      if (!r || !match) return send(res, 404, { error: 'not found' });
      const claims = await verify(req.headers.authorization);
      if (!claims) return send(res, 401, { error: 'not signed in' });
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match![i + 1])]));
      const body = req.method === 'GET' ? {} : await readJson(req);
      const out = await r.handler({ pool, claims, params, query: url.searchParams, body });
      send(res, 200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'server error' });
    }
  });
}

if (process.argv[1] === import.meta.filename) {
  const port = Number(process.env.PORT ?? 8787);
  createServer().listen(port, () => console.log(`fobo api on :${port}`));
}
