// Google sign-in in the browser build: Neon Auth sends the browser to Google and back. Neon Auth
// keeps the Calendar refresh token, so the API can sync without another step.
const AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL ?? '';
const CALENDAR = 'https://www.googleapis.com/auth/calendar.events';

export async function signInWithGoogle(next: string): Promise<boolean> {
  const res = await fetch(`${AUTH_URL}/sign-in/social`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', callbackURL: `${window.location.origin}${next}`, scopes: [CALENDAR] }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error(data?.message ?? 'Google sign-in is unavailable right now.');
  window.location.href = data.url;
  return false; // the page is leaving; the app continues at `next` after Google
}
