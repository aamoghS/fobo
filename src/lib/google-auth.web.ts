// Browser build: Google sign-in through the API; it comes back to /auth (src/app/auth.tsx).
import { API_URL } from './api';

export async function signInWithGoogle(next: string): Promise<boolean> {
  const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
  window.location.href = `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`;
  return false;
}
