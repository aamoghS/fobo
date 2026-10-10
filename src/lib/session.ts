// iOS and Android: the session from Google sign-in (src/lib/google-auth.ts), kept while the app is open.
let session: string | null = null;

export function setSession(value: string | null) {
  session = value;
}

export async function apiToken(): Promise<string | null> {
  return session;
}
