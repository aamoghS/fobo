// Google sign-in on iOS and Android: Google's native sheet, then Neon Auth with the ID token.
// Google's one-time server code goes to the API, which keeps the Calendar refresh token in Neon Auth.
// The native module is only in development builds, not Expo Go, so it is loaded on first use.
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';

import { api } from './api';
import { setSession } from './session';

const AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL ?? '';
const CALENDAR = 'https://www.googleapis.com/auth/calendar.events';

let google: typeof GoogleSignInModule | null = null;

function load() {
  if (google) return google;
  try {
    google = require('@react-native-google-signin/google-signin') as typeof GoogleSignInModule;
  } catch {
    // Expo Go has no native Google module, and Neon Auth only returns to web addresses, so Google
    // sign-in on a phone needs the Fobo development build (eas build --profile development).
    throw new Error('Google sign-in works in the Fobo app build, not in Expo Go. You can still look around with sample data.');
  }
  google.GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
    scopes: [CALENDAR],
  });
  return google;
}

/** True when signed in; false when the person closed Google's sheet. */
export async function signInWithGoogle(_next: string): Promise<boolean> {
  const { GoogleSignin, isSuccessResponse } = load();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;
  const { idToken, serverAuthCode } = response.data;
  if (!idToken) throw new Error('Google did not return an ID token.');

  const res = await fetch(`${AUTH_URL}/sign-in/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', idToken: { token: idToken } }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.token) throw new Error(data?.message ?? 'Google sign-in is unavailable right now.');
  setSession(data.token);

  // Calendar access: hand the one-time code to the API. A failure here leaves sign-in working.
  if (serverAuthCode) await api('POST', '/google-code', { code: serverAuthCode });
  return true;
}
