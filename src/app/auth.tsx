import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { homeAfterSignIn, loadLive } from '@/data/live';
import { completeLink, takeSignInNonce } from '@/lib/google-auth';
import { notify } from '@/lib/notify';
import { setSession } from '@/lib/session';

/** A path inside the app, never another site. */
const inApp = (path: string | undefined): path is string => !!path && path.startsWith('/') && !path.startsWith('//');

/** Where Google sign-in returns: keeps the session, loads the user's data, moves on. */
export default function AuthReturn() {
  const { session, next, nonce, link } = useLocalSearchParams<{ session?: string; next?: string; nonce?: string; link?: string }>();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    // Only a session from a sign-in this app started is kept; a link carrying someone else's is ignored.
    if (session && takeSignInNonce(nonce)) setSession(session);
    // Linking Google to an email account returns here on the web with a ticket (native finishes it in linkGoogle).
    (link ? completeLink(link).catch((e) => notify(e instanceof Error ? e.message : 'Linking Google failed. Try again.')) : Promise.resolve())
      .then(() => loadLive())
      .catch(() => false)
      // Back to where sign-in started (like the calendar step mid-onboarding), unless onboarding comes
      // first. Sign-in from Welcome (onboarding's start) still goes wherever this account belongs.
      .then((signedIn) => {
        const midOnboarding = inApp(next) && next.startsWith('/onboarding/') && next !== '/onboarding/start';
        setTo(!signedIn ? '/welcome' : midOnboarding || (inApp(next) && homeAfterSignIn() === '/week') ? next! : homeAfterSignIn());
      });
  }, [session, nonce, next, link]);

  if (!to) return null;
  return <Redirect href={to as '/week'} />;
}
