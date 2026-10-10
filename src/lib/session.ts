// iOS and Android: the Neon Auth session token from Google sign-in (src/lib/google-auth.ts) is traded
// for a JWT for the API. Null when signed out. The session lasts while the app is open.
const AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL ?? '';

let session: string | null = null;

export function setSession(token: string | null) {
  session = token;
}

export async function apiToken(): Promise<string | null> {
  if (!session || !AUTH_URL) return null;
  const res = await fetch(`${AUTH_URL}/token`, { headers: { Authorization: `Bearer ${session}` } }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { token?: string }).token ?? null;
}
