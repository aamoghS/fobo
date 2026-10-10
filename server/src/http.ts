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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function json(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: CORS });
  return Response.json(body, { status, headers: CORS });
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
