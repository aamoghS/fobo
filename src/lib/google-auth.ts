// iOS and Android, in Expo Go and in builds: Google sign-in runs through the API in an in-app browser.
// A one-time nonce ties the returning session to the sign-in this app started.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { API_URL } from './api';
import { setSession } from './session';

let pending: string | null = null;

/** True when signed in; false when the person closed the browser. */
export async function signInWithGoogle(_next: string): Promise<boolean> {
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  pending = nonce;
  const returnTo = Linking.createURL('auth', { queryParams: { nonce } });
  const result = await WebBrowser.openAuthSessionAsync(
    `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`,
    returnTo,
  );
  if (result.type !== 'success') return false;
  const { session, error, nonce: back } = Linking.parse(result.url).queryParams ?? {};
  if (typeof session !== 'string' || !takeSignInNonce(typeof back === 'string' ? back : undefined)) {
    throw new Error(`Google sign-in failed (${error ?? 'no session'}).`);
  }
  setSession(session);
  return true;
}

/** True once, for the nonce of the sign-in in progress (the /auth route uses it when the link opens the app). */
export function takeSignInNonce(nonce: string | undefined): boolean {
  const ok = !!nonce && nonce === pending;
  if (ok) pending = null;
  return ok;
}
