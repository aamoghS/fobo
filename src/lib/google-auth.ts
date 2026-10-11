// iOS and Android, in Expo Go and in builds: Google sign-in runs through the API in an in-app browser.
// A one-time nonce ties the returning session to the sign-in this app started.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { API_URL, send } from './api';
import { finishLink } from './google-link';
import { setSession } from './session';

let pending: string | null = null;

/**
 * True when signed in; false when the person closed the browser. `next` is where the app goes back to
 * if the return link opens it through the /auth route (as it can mid-onboarding), rather than home.
 */
export async function signInWithGoogle(next: string): Promise<boolean> {
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  pending = nonce;
  const returnTo = Linking.createURL('auth', { queryParams: { nonce, next } });
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

/**
 * Connects Google Calendar to the email account signed in, rather than signing in to a separate Google
 * account. True when linked (the API links Calendar and syncs on the way back); false when the person
 * closed the browser.
 */
export async function linkGoogle(next: string): Promise<boolean> {
  const returnTo = Linking.createURL('auth', { queryParams: { next } });
  const res = await send<{ url: string; key: string }>('POST', '/auth/google/link', { returnTo });
  if ('error' in res) throw new Error(res.error);
  const result = await WebBrowser.openAuthSessionAsync(res.data.url, returnTo);
  if (result.type !== 'success') return false;
  const { link, error } = Linking.parse(result.url).queryParams ?? {};
  if (typeof link !== 'string') throw new Error(`Google sign-in failed (${error ?? 'not linked'}).`);
  await finishLink(link, res.data.key);
  return true;
}

/** The web build finishes a link on /auth; here linkGoogle already has. */
export async function completeLink(_ticket: string): Promise<boolean> {
  return false;
}

/** True once, for the nonce of the sign-in in progress (the /auth route uses it when the link opens the app). */
export function takeSignInNonce(nonce: string | undefined): boolean {
  const ok = !!nonce && nonce === pending;
  if (ok) pending = null;
  return ok;
}
