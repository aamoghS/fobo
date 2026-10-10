import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { loadLive } from '@/data/live';
import { setSession } from '@/lib/session';

/** Where Google sign-in returns: keeps the session, loads the user's data, moves on. */
export default function AuthReturn() {
  const { session, next } = useLocalSearchParams<{ session?: string; next?: string }>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (session) setSession(session);
    loadLive().catch(() => false).finally(() => setDone(true));
  }, [session]);

  if (!done) return null;
  return <Redirect href={session ? ((next ?? '/onboarding/start') as '/week') : '/welcome'} />;
}
