// Fills the data modules in src/data/ from the Fobo API when signed in, so screens read real data
// through the same imports. Signed out (or the API unreachable), the mock data stays as it is.
import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { saveCharacter, type Character } from '@/features/profile/character';
import { answers } from '@/features/profile/onboarding';
import type { Plan } from '@/features/plans/types';
import { api } from '@/lib/api';
import { setSession } from '@/lib/session';
import { refreshToday } from '@/lib/week';

import { people, type Person } from './people';
import { planDetails, plans, type PlanDetail } from './plans';
import { achievements, capacity, profile, widget, type Achievement } from './profile';
import { NOW, setNow, week } from './week';

type ApiPlan = Plan & { detail?: PlanDetail };
type ApiWeek = { start: string; end: string; personalHours: number; upNext: { title: string; when: string } | null };
type ApiProfile = {
  profile: { name: string; title: string | null; email: string | null; streak: typeof profile.streak };
  achievements: Achievement[];
  widget: { label: string; headline: string; next: string; nudge: string | null };
  capacity: typeof capacity;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

// The sample data, restored on sign-out.
const sample = structuredClone({ plans, planDetails, people, profile, achievements, widget, capacity, week, now: NOW });

function restoreSample() {
  const s = structuredClone(sample);
  replace(plans, s.plans);
  for (const key of Object.keys(planDetails)) delete planDetails[key];
  Object.assign(planDetails, s.planDetails);
  replace(people, s.people);
  Object.assign(profile, s.profile);
  replace(achievements, s.achievements);
  Object.assign(widget, s.widget);
  replace(capacity, s.capacity);
  Object.assign(week, s.week);
  setNow(s.now);
  refreshToday();
  for (const key of Object.keys(answers)) delete answers[key as keyof typeof answers];
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

/** Move it: same times, another day ("2026-10-11"). Sample data only for now. */
export function movePlan(id: string, date: string) {
  updatePlan(id, (p) => ({ ...p, start: `${date}${p.start.slice(10)}`, end: `${date}${p.end.slice(10)}` }));
}

// Plans are replaced, never edited in place: screens are memoised by object identity (React Compiler).
function updatePlan(id: string, change: (p: Plan) => Plan) {
  const at = plans.findIndex((p) => p.id === id);
  if (at < 0) return;
  plans[at] = change(plans[at]);
  bump();
}

/**
 * Plan my exit: the plan keeps its times (as on the Event screen, "7–11 AM · Leave by 10:30"),
 * carries the leave-by, and costs what the shorter stay costs. Sample data only for now.
 */
export function setExit(id: string, energyCost: number, label: string, note: string) {
  const fullCost = planDetails[id]?.fullCost ?? plans.find((p) => p.id === id)?.energyCost;
  planDetails[id] = { ...planDetails[id], fullCost, exit: { leaveBy: label, note } };
  updatePlan(id, (p) => ({ ...p, energyCost, leaveBy: label }));
}

export function signOut() {
  setSession(null);
  restoreSample();
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

/** For screens that show live data: redraws after each load and refreshes when the screen opens. */
export function useLiveScreen() {
  useFocusEffect(useCallback(() => void refreshLive(), []));
  return useLive();
}

/** True when the app is showing the signed-in user's data. */
export async function loadLive(): Promise<boolean> {
  const me = await api<{ character: Character | null; onboarding: Record<string, string> | null }>('GET', '/me');
  if (!me) return false;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const start = localDay(monday);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const [w, list, circle, you] = await Promise.all([
    api<ApiWeek>('GET', `/week?start=${start}`),
    api<ApiPlan[]>('GET', `/plans?from=${start}T00:00&to=${localDay(nextMonday)}T00:00`),
    api<Person[]>('GET', '/people'),
    api<ApiProfile>('GET', '/profile'),
  ]);

  setNow(`${localDay(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  refreshToday();
  if (w) {
    Object.assign(week, {
      start: w.start,
      end: w.end,
      personalHours: w.personalHours,
      upNext: w.upNext ?? { title: 'Nothing planned', when: '' },
    });
  }
  if (list) {
    replace(plans, list);
    for (const key of Object.keys(planDetails)) delete planDetails[key];
    for (const p of list) if (p.detail && Object.keys(p.detail).length) planDetails[p.id] = p.detail;
  }
  if (circle) replace(people, circle);
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
  if (me.character) saveCharacter(me.character, { remote: false });
  Object.assign(answers, me.onboarding ?? {});
  lastLoad = Date.now();
  bump();
  return true;
}
