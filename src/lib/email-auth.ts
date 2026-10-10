// Email sign-up and log-in through the API. On success the session is kept like Google's.
import { API_URL } from './api';
import { setSession } from './session';

type Result = { ok: true } | { ok: false; error: string };

async function post(path: string, body: Record<string, string>): Promise<Result> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, error: "Can't reach Fobo. Check your connection." };
  const data = (await res.json().catch(() => ({}))) as { session?: string; error?: string };
  if (!res.ok || !data.session) return { ok: false, error: data.error ?? 'Something went wrong. Try again.' };
  setSession(data.session);
  return { ok: true };
}

export const signUpWithEmail = (name: string, email: string, password: string) =>
  post('/auth/email/signup', { name, email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

export const logInWithEmail = (email: string, password: string) => post('/auth/email/login', { email, password });
