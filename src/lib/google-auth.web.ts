// Browser build: Google sign-in through the API; it comes back to /auth (src/app/auth.tsx). A one-time
// nonce kept in this tab ties the returning session to a sign-in this tab started.
import { API_URL, send } from './api';
import { finishLink } from './google-link';

const NONCE = 'fobo.signin';
const LINK = 'fobo.link';

export async function signInWithGoogle(next: string): Promise<boolean> {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE, nonce);
  const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}&nonce=${nonce}`;
  window.location.href = `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`;
  return false;
}

/**
 * Connects Google Calendar to the email account signed in. It comes back to /auth with a `link` ticket,
 * which completeLink finishes with the key kept in this tab.
 */
export async function linkGoogle(next: string): Promise<boolean> {
  const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
  const res = await send<{ url: string; key: string }>('POST', '/auth/google/link', { returnTo });
  if ('error' in res) throw new Error(res.error);
  sessionStorage.setItem(LINK, res.data.key);
  window.location.href = res.data.url;
  return false;
}

/** True once the ticket /auth came back with is linked; false when this tab didn't start a link. */
export async function completeLink(ticket: string): Promise<boolean> {
  const key = sessionStorage.getItem(LINK);
  sessionStorage.removeItem(LINK);
  if (!key) return false;
  await finishLink(ticket, key);
  return true;
}

/** True once, for the nonce this tab's sign-in started with. */
export function takeSignInNonce(nonce: string | undefined): boolean {
  const expected = sessionStorage.getItem(NONCE);
  sessionStorage.removeItem(NONCE);
  return !!nonce && nonce === expected;
}
