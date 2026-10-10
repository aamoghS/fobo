// Browser build: Neon Auth keeps the session in its own cookie, so a JWT for the API comes from
// Neon Auth's /token with credentials. Null when signed out.
const AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL ?? '';

export async function apiToken(): Promise<string | null> {
  if (!AUTH_URL) return null;
  const res = await fetch(`${AUTH_URL}/token`, { credentials: 'include' }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { token?: string }).token ?? null;
}
