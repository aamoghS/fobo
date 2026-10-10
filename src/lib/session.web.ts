// Browser build: the session from Google sign-in, kept in localStorage.
const KEY = 'fobo.session';

export function setSession(value: string | null) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {}
}

export async function apiToken(): Promise<string | null> {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
