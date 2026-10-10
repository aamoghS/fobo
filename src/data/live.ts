// Fills the data modules in src/data/ from the Fobo API, so screens read the signed-in user's data
// through the same imports. Signed out, they are empty.
import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { DEFAULT_CHARACTER, saveCharacter, type Character } from '@/features/profile/character';
import { answers } from '@/features/profile/answers';
import type { Plan } from '@/features/plans/types';
import { api } from '@/lib/api';
import { setSession } from '@/lib/session';
import { refreshToday } from '@/lib/week';

import { inviteFrom, invites } from './invites';
import { people, type Person } from './people';
import { planDetails, plans, type PlanDetail } from './plans';
import { achievements, capacity, profile, widget, type Achievement } from './profile';
import { NO_NEXT, localDay, localNow, mondayOf, resetWeek, setNow, week } from './week';

type ApiPlan = Plan & { detail?: PlanDetail };
type ApiWeek = { start: string; end: string; personalHours: number; upNext: typeof week.upNext | null };
type ApiProfile = {
  profile: { name: string; title: string | null; email: string | null; streak: typeof profile.streak };
  achievements: Achievement[];
  widget: { label: string; headline: string; next: string; nudge: string | null };
  capacity: typeof capacity;
};
type ApiMe = { timezone: string; character: Character | null; onboarding: Record<string, string> | null };

/** The phone's timezone, like 'America/New_York'. The API reads and writes local times in it. */
const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
let timezoneSent = false;

// Screens that show profile data call useLive() so they redraw after each load.
let version = 0;
const listeners = new Set<() => void>();
export function useLive() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => version,
  );
}

function bump() {
  version++;
  listeners.forEach((l) => l());
}

function replace<T>(list: T[], items: T[]) {
  list.splice(0, list.length, ...items);
}

const blankProfile = structuredClone(profile);
const blankWidget = structuredClone(widget);

function clearLive() {
  replace(plans, []);
  replace(invites, []);
  for (const key of Object.keys(planDetails)) delete planDetails[key];
  replace(people, []);
  Object.assign(profile, structuredClone(blankProfile));
  replace(achievements, []);
  Object.assign(widget, blankWidget);
  replace(capacity, []);
  resetWeek();
  refreshToday();
  for (const key of Object.keys(answers)) delete answers[key as keyof typeof answers];
  saveCharacter(DEFAULT_CHARACTER, { remote: false });
  bump();
}

export function signOut() {
  signedIn = false;
  setSession(null);
  clearLive();
}

// Reloads at most every 15 s, and pulls Google Calendar changes at most once a minute.
let lastLoad = 0;
let lastSync = 0;
export async function refreshLive() {
  const now = Date.now();
  if (now - lastLoad < 15_000) return;
  lastLoad = now;
  if (now - lastSync > 60_000) {
    lastSync = now;
    await api('POST', '/google-sync', {});
  }
  await loadLive().catch(() => false);
}

// While the app is in the foreground it refreshes every 30 s, so changes made elsewhere (Google Calendar,
// another device, friends) show up on their own.
let timer: ReturnType<typeof setInterval> | null = null;
export function autoRefresh(on: boolean) {
  if (on && !timer) timer = setInterval(() => void refreshLive(), 30_000);
  if (!on && timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** For screens that show live data: redraws after each load and refreshes when the screen opens. */
export function useLiveScreen() {
  useFocusEffect(useCallback(() => void refreshLive(), []));
  return useLive();
}

let signedIn = false;
/** True after the user's data loaded with a working session. */
export const isSignedIn = () => signedIn;

/** True when signed in and the user's data loaded. */
export async function loadLive(): Promise<boolean> {
  let me = await api<ApiMe>('GET', '/me');
  if (!me) return false;
  signedIn = true;
  // Local times are the phone's: keep the profile's timezone in step with it (and pull Google again in full).
  if (me.timezone !== deviceTimezone() && !timezoneSent) {
    timezoneSent = true;
    me = (await api<ApiMe>('PATCH', '/me', { timezone: deviceTimezone() })) ?? me;
    lastSync = 0;
    await api('POST', '/google-sync', {});
  }

  const now = new Date();
  const monday = mondayOf(now);
  const start = localDay(monday);
  // Four weeks of plans, so Plans shows what is coming up.
  const until = new Date(monday);
  until.setDate(monday.getDate() + 28);

  const [w, list, circle, you] = await Promise.all([
    api<ApiWeek>('GET', `/week?start=${start}`),
    api<ApiPlan[]>('GET', `/plans?from=${start}T00:00&to=${localDay(until)}T00:00`),
    api<Person[]>('GET', '/people'),
    api<ApiProfile>('GET', '/profile'),
  ]);

  setNow(localNow(now));
  refreshToday();
  if (w) Object.assign(week, { start: w.start, end: w.end, personalHours: w.personalHours, upNext: w.upNext ?? NO_NEXT });
  if (circle) replace(people, circle);
  if (list) {
    // Your plans: not declined ones (turned down in Google Calendar, or deleted in Fobo), and not invites
    // you haven't answered, which wait on Weigh a plan instead.
    const shown = list.filter((p) => p.status !== 'declined' && p.status !== 'proposed');
    replace(plans, shown);
    replace(invites, list.filter((p) => p.status === 'proposed' && p.end > localNow(now)).map((p) => inviteFrom(p, people)));
    for (const key of Object.keys(planDetails)) delete planDetails[key];
    for (const p of shown) if (p.detail && Object.keys(p.detail).length) planDetails[p.id] = p.detail;
  }
  if (you) {
    Object.assign(profile, {
      name: you.profile.name,
      title: you.profile.title ?? '',
      email: you.profile.email ?? '',
      streak: you.profile.streak,
    });
    replace(achievements, you.achievements);
    Object.assign(widget, { ...you.widget, nudge: you.widget.nudge ?? '' });
    replace(capacity, you.capacity);
  }
  saveCharacter(me.character ?? DEFAULT_CHARACTER, { remote: false });
  for (const key of Object.keys(answers)) delete answers[key as keyof typeof answers];
  Object.assign(answers, me.onboarding ?? {});
  lastLoad = Date.now();
  bump();
  return true;
}
