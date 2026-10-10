import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { loadLive } from '@/data/live';
import { takeSignInNonce } from '@/lib/google-auth';
import { setSession } from '@/lib/session';

/** A path inside the app, never another site. */
const inApp = (path: string | undefined): path is string => !!path && path.startsWith('/') && !path.startsWith('//');

/** Where Google sign-in returns: keeps the session, loads the user's data, moves on. */
export default function AuthReturn() {
  const { session, next, nonce } = useLocalSearchParams<{ session?: string; next?: string; nonce?: string }>();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    // Only a session from a sign-in this app started is kept; a link carrying someone else's is ignored.
    if (session && takeSignInNonce(nonce)) setSession(session);
    loadLive()
      .catch(() => false)
      .then((signedIn) => setTo(signedIn ? (inApp(next) ? next : '/onboarding/start') : '/welcome'));
  }, [session, nonce, next]);

  if (!to) return null;
  return <Redirect href={to as '/week'} />;
}
