import type { IncomingMessage, ServerResponse } from 'node:http';
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

// '/events/:id' becomes a regex with named keys.
export function route(method: string, path: string, handler: Handler): Route {
  const keys: string[] = [];
  const src = path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'));
  return { method, pattern: new RegExp(`^${src}$`), keys, handler };
}

export function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

export async function readJson(req: IncomingMessage): Promise<any> {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}
