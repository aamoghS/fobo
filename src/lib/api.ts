import { apiToken } from './session';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Last answer per GET path with its ETag: unchanged data comes back as an empty 304 and is reused.
const cache = new Map<string, { etag: string; body: unknown }>();

/** Calls the Fobo API as the signed-in user. Null when signed out or the API is unreachable. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = await apiToken();
  if (!token || !API_URL) return null;
  const hit = method === 'GET' ? cache.get(path) : undefined;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(hit ? { 'If-None-Match': hit.etag } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (res?.status === 304 && hit) return hit.body as T;
  if (!res?.ok) return null;
  const data = (await res.json()) as T;
  const etag = res.headers.get('etag');
  if (method === 'GET' && etag) cache.set(path, { etag, body: data });
  else if (method !== 'GET') cache.clear(); // a change may affect any view
  return data;
}
