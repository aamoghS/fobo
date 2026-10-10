import { apiToken } from './session';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/** Calls the Fobo API as the signed-in user. Null when signed out or the API is unreachable. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = await apiToken();
  if (!token || !API_URL) return null;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as T;
}
