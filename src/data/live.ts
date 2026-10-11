// Fills the data modules in src/data/ from the Fobo API, so screens read the signed-in user's data
// through the same imports. Signed out, they are empty.
import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { DEFAULT_CHARACTER, saveCharacter, type Character } from '@/features/profile/character';
import { answers } from '@/features/profile/answers';
import type { Plan } from '@/features/plans/types';
import { api, send } from '@/lib/api';
import { notify } from '@/lib/notify';
import { setSession } from '@/lib/session';
import { WEEKS_AHEAD, WEEKS_BACK, refreshToday } from '@/lib/week';
import { DEFAULT_TINT } from '@fobo/core/options';

import { inviteFrom, invites } from './invites';
import { people, requests, sent, type Person } from './people';
import { planDetails, plans, tentative, type PlanDetail } from './plans';
import { achievements, capacity, profile, widget, type Achievement } from './profile';
import { NO_NEXT, localDay, localNow, resetWeek, setNow, week, weekStartOf } from './week';

// GET /plans sends the Event screen's details as flat fields (server/src/routes/events.ts planColumns).
type ApiPlan = Plan & { costNote: string | null; exitNote: string | null; reminder: string | null; fullCost: number | null };
type ApiWeek = { start: string; end: string; personalHours: number; upNext: typeof week.upNext | null };
type ApiProfile = {
  profile: { name: string; title: string | null; email: string | null; streak: typeof profile.streak };
  achievements: Achievement[];
  widget: { label: string; headline: string; next: string; nudge: string | null };
  capacity: typeof capacity;
};
type ApiMe = { handle: string; timezone: string; character: Character | null; onboarding: Record<string, string> | null };
type ApiFriend = { id: string; handle: string; name: string | null; tint: string | null; character: Character | null };

// A friend request in the Person shape; nextLabel is their @handle.
const pending = (f: ApiFriend): Person => ({
  id: f.id,
  name: f.name ?? f.handle,
  tint: (f.tint ?? DEFAULT_TINT) as Person['tint'],
  nextLabel: `@${f.handle}`,
  ...(f.character ? { character: f.character } : {}),
});

/** The phone's timezone, like 'America/New_York'. The API reads and writes local times in it. */
const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
let timezoneSent = false;

// Screens that show profile data call useLive() so they redraw after each load. The data lives in
// module-level arrays that change in place, so those screens opt out of React Compiler's
// memoisation ('use no memo'); otherwise the compiler keeps their first reads.
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
  replace(tentative, []);
  replace(invites, []);
  for (const key of Object.keys(planDetails)) delete planDetails[key];
  replace(people, []);
  replace(requests, []);
  replace(sent, []);
  Object.assign(profile, structuredClone(blankProfile));
  replace(achievements, []);
  Object.assign(widget, blankWidget);
  replace(capacity, []);
  resetWeek();
  refreshToday();
  for (const key of Object.keys(answers)) delete answers[key as keyof typeof answers];
  onboarded = false;
  saveCharacter(DEFAULT_CHARACTER, { remote: false });
  bump();
}

/**
 * Adds a plan to the week (Weigh a plan's "Add as planned"), taking the place of the plan it stands
 * in for, and redraws. Sample data only for now: nothing is sent to the API yet.
 */
export function addPlan(plan: Plan, replaces?: string) {
  const at = replaces ? plans.findIndex((p) => p.id === replaces) : -1;
  if (at >= 0) plans.splice(at, 1);
  plans.push(plan);
  bump();
}

/** Move it: same times, another day ("2026-10-11"). Shows at once, then saves; a failed save puts it back. */
export function movePlan(id: string, date: string) {
  const plan = plans.find((p) => p.id === id);
  if (!plan) return;
  // A plan that runs past midnight still ends the day after.
  const end = new Date(`${date}T00:00`);
  end.setDate(end.getDate() + Math.round((Date.parse(plan.end.slice(0, 10)) - Date.parse(plan.start.slice(0, 10))) / 864e5));
  const moved = { start: `${date}${plan.start.slice(10)}`, end: `${localDay(end)}${plan.end.slice(10)}` };
  updatePlan(id, (p) => ({ ...p, ...moved }));
  void save(id, moved);
}

/** Saves a change the screen already shows; on failure says why and reloads, undoing it. */
async function save(id: string, body: Record<string, unknown>) {
  const result = await send('PATCH', `/plans/${id}`, body);
  if ('error' in result) {
    notify(result.error);
    await loadLive().catch(() => false);
  }
}

// Plans are replaced, never edited in place: screens are memoised by object identity (React Compiler).
function updatePlan(id: string, change: (p: Plan) => Plan) {
  const at = plans.findIndex((p) => p.id === id);
  if (at < 0) return;
  plans[at] = change(plans[at]);
  bump();
}

/** The Event screen's rows from a plan's flat detail fields, in PlanDetail's shape. */
function detailOf(p: ApiPlan): PlanDetail {
  return {
    ...(p.costNote ? { costNote: p.costNote } : {}),
    ...(p.fullCost != null ? { fullCost: p.fullCost } : {}),
    ...(p.leaveBy ? { exit: { leaveBy: p.leaveBy, ...(p.exitNote ? { note: p.exitNote } : {}) } } : {}),
    ...(p.reminder ? { reminder: p.reminder } : {}),
  };
}

/**
 * Plan my exit: the plan keeps its times (as on the Event screen, "7–11 AM · Leave by 10:30"),
 * carries the leave-by and the nudge, and costs what the shorter stay costs. Shows at once, then saves.
 */
export function setExit(id: string, energyCost: number, label: string, note: string, reminder: string) {
  const kept = planDetails[id]?.fullCost;
  const fullCost = kept ?? plans.find((p) => p.id === id)?.energyCost;
  planDetails[id] = { ...planDetails[id], fullCost, exit: { leaveBy: label, note }, reminder };
  updatePlan(id, (p) => ({ ...p, energyCost, leaveBy: label }));
  // The full cost is saved once, before the first exit lowers the cost: later exits are weighed from it.
  const first = kept === undefined && fullCost !== undefined ? { fullCost } : {};
  void save(id, { energyCost, leaveBy: label, exitNote: note, reminder, ...first });
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

let onboarded = false;
/** Where a signed-in user starts: the week once they've been through onboarding, onboarding before. */
export const homeAfterSignIn = () => (onboarded ? '/week' : '/onboarding/start') as '/week';
/** Onboarding's last step (or Skip through it) marks it done. */
export function markOnboarded() {
  onboarded = true;
}

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
  const sunday = weekStartOf(now);
  const start = localDay(sunday);
  // Four weeks of plans either side, so Plans shows what is coming up and Your week can swipe back.
  const from = new Date(sunday);
  from.setDate(sunday.getDate() - 7 * WEEKS_BACK);
  const until = new Date(sunday);
  until.setDate(sunday.getDate() + 7 * (WEEKS_AHEAD + 1));

  const [w, list, circle, friends, you] = await Promise.all([
    api<ApiWeek>('GET', `/week?start=${start}`),
    api<ApiPlan[]>('GET', `/plans?from=${localDay(from)}T00:00&to=${localDay(until)}T00:00`),
    api<Person[]>('GET', '/people'),
    api<{ incoming: ApiFriend[]; outgoing: ApiFriend[] }>('GET', '/friends'),
    api<ApiProfile>('GET', '/profile'),
  ]);

  setNow(localNow(now));
  refreshToday();
  if (w) Object.assign(week, { start: w.start, end: w.end, personalHours: w.personalHours, upNext: w.upNext ?? NO_NEXT });
  if (circle) replace(people, circle);
  if (friends) {
    replace(requests, friends.incoming.map(pending));
    replace(sent, friends.outgoing.map(pending));
  }
  if (list) {
    // Your plans: not declined ones (turned down in Google Calendar, or deleted in Fobo), and not invites
    // you haven't answered, which wait on Weigh a plan instead.
    const shown = list.filter((p) => p.status !== 'declined' && p.status !== 'proposed');
    const waiting = list.filter((p) => p.status === 'proposed' && p.end > localNow(now));
    replace(plans, shown);
    replace(tentative, waiting);
    replace(invites, waiting.map((p) => inviteFrom(p, people)));
    for (const key of Object.keys(planDetails)) delete planDetails[key];
    for (const p of [...shown, ...waiting]) {
      const detail = detailOf(p);
      if (Object.keys(detail).length) planDetails[p.id] = detail;
    }
  }
  if (you) {
    Object.assign(profile, {
      name: you.profile.name,
      title: you.profile.title ?? '',
      email: you.profile.email ?? '',
      handle: me.handle,
      streak: you.profile.streak,
    });
    replace(achievements, you.achievements);
    Object.assign(widget, { ...you.widget, nudge: you.widget.nudge ?? '' });
    replace(capacity, you.capacity);
  }
  saveCharacter(me.character ?? DEFAULT_CHARACTER, { remote: false });
  for (const key of Object.keys(answers)) delete answers[key as keyof typeof answers];
  const { done, ...picked } = me.onboarding ?? {};
  Object.assign(answers, picked);
  // Finished, or (for profiles from before the done mark) answered something.
  onboarded = !!done || Object.keys(picked).length > 0;
  lastLoad = Date.now();
  bump();
  return true;
}
