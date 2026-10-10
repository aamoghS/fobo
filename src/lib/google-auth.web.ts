// Browser build: Google sign-in through the API; it comes back to /auth (src/app/auth.tsx). A one-time
// nonce kept in this tab ties the returning session to a sign-in this tab started.
import { API_URL } from './api';

const NONCE = 'fobo.signin';

export async function signInWithGoogle(next: string): Promise<boolean> {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE, nonce);
  const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}&nonce=${nonce}`;
  window.location.href = `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`;
  return false;
}

/** True once, for the nonce this tab's sign-in started with. */
export function takeSignInNonce(nonce: string | undefined): boolean {
  const expected = sessionStorage.getItem(NONCE);
  sessionStorage.removeItem(NONCE);
  return !!nonce && nonce === expected;
}
