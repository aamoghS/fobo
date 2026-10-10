// iOS and Android: the session from Google sign-in (src/lib/google-auth.ts), kept in the phone's
// secure storage so it survives closing the app.
import * as SecureStore from 'expo-secure-store';

const KEY = 'fobo.session';
let session: string | null = null;
let loaded = false;

export function setSession(value: string | null) {
  session = value;
  loaded = true;
  void (value ? SecureStore.setItemAsync(KEY, value) : SecureStore.deleteItemAsync(KEY)).catch(() => {});
}

export async function apiToken(): Promise<string | null> {
  if (!loaded) {
    session = await SecureStore.getItemAsync(KEY).catch(() => null);
    loaded = true;
  }
  return session;
}
