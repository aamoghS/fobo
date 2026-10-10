// Serves the API handler with Node, for local runs. Production runs functions/api.ts
// on Neon Functions.
//   npm run dev   (from server/, loads ../.env.local)
import http from 'node:http';
import type pg from 'pg';
import { createHandler } from './app.ts';
import { createPool } from './db.ts';

export function createServer(pool: pg.Pool = createPool()) {
  const handle = createHandler(pool);
  return http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const out = await handle(new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
      method: req.method,
      headers,
      body: chunks.length && req.method !== 'GET' ? Buffer.concat(chunks) : undefined,
    }));
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  });
}

if (process.argv[1] === import.meta.filename) {
  const port = Number(process.env.PORT ?? 8787);
  createServer().listen(port, () => console.log(`fobo api on :${port}`));
}
