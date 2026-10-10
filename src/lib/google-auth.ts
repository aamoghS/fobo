// iOS and Android, in Expo Go and in builds: Google sign-in runs through the API in an in-app browser.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { setSession } from './session';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/** True when signed in; false when the person closed the browser. */
export async function signInWithGoogle(_next: string): Promise<boolean> {
  const returnTo = Linking.createURL('auth');
  const result = await WebBrowser.openAuthSessionAsync(
    `${API_URL}/auth/google/start?return=${encodeURIComponent(returnTo)}`,
    returnTo,
  );
  if (result.type !== 'success') return false;
  const { session, error } = Linking.parse(result.url).queryParams ?? {};
  if (typeof session !== 'string') throw new Error(`Google sign-in failed (${error ?? 'no session'}).`);
  setSession(session);
  return true;
}
