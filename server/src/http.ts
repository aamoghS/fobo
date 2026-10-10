import type pg from 'pg';
import type { Claims } from './db.ts';

export type Ctx = {
  pool: pg.Pool;
  claims: Claims;
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
};

export type Handler = (ctx: Ctx) => Promise<unknown>;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

// '/plans/:id' becomes a regex with named keys.
export function route(method: string, path: string, handler: Handler): Route {
  const keys: string[] = [];
  const src = path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'));
  return { method, pattern: new RegExp(`^${src}$`), keys, handler };
}

import { createHash } from 'node:crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, if-none-match',
  'Access-Control-Expose-Headers': 'etag',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function json(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: CORS });
  return Response.json(body, { status, headers: CORS });
}

// A GET answer with an ETag: when the app already has this exact data (If-None-Match), the answer is an
// empty 304 and the app reuses its copy. Private: per-user data is never stored by shared caches.
export function cached(req: Request, body: unknown): Response {
  const text = JSON.stringify(body);
  const etag = `W/"${createHash('sha1').update(text).digest('base64url')}"`;
  const headers = { ...CORS, ETag: etag, 'Cache-Control': 'private, no-cache', Vary: 'Authorization' };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(text, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
}

export async function readJson(req: Request): Promise<any> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}
