// Browser build: Google sign-in through the API; it comes back to /auth (src/app/auth.tsx).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export async function signInWithGoogle(next: string): Promise<boolean> {
  const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
  window.location.href = `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`;
  return false;
}
