import type { ShelfDay } from '@/components/WeekShelf';
import { plans } from '@/data/plans';
import { NOW, week } from '@/data/week';
import type { Plan, PlanKind } from '@/features/plans/types';

import { dayLoad } from '@/features/capacity/day-load';

import { dayMood } from './energy';
import { daysBetween, isoDay, weekdayInitial } from './format';

let today = isoDay(NOW);

export const plansOn = (day: string) =>
  plans.filter((p) => isoDay(p.start) === day).sort((a, b) => a.start.localeCompare(b.start));

/** Load on a day, out of DAY_ROOM. */
export const dayLoadOn = (date: string) => Math.round(dayLoad(plansOn(date)));

export function shelfDays(selected: string = today): ShelfDay[] {
  return daysBetween(week.start, week.end).map((date) => {
    const dayPlans = plansOn(date);
    const past = date < today;
    return {
      date,
      label: weekdayInitial(date),
      plans: dayPlans,
      mood: dayMood(dayPlans, past),
      past,
      selected: date === selected,
    };
  });
}

/** Plans today that haven't ended yet (rest doesn't count as a plan). */
export const plansLeftToday = () => plansOn(today).filter((p) => p.kind !== 'rest' && p.end > NOW).length;

export let todayIso = today;

/** Recomputes today after src/data/live.ts sets NOW. */
export function refreshToday() {
  today = isoDay(NOW);
  todayIso = today;
}

/** Plan filters on the Plans screen. "Personal" covers enjoy and rest. */
export const PLAN_FILTERS = [
  { key: 'all', label: 'All', kinds: null },
  { key: 'work', label: 'Work', kinds: ['work'] },
  { key: 'social', label: 'Social', kinds: ['social'] },
  { key: 'obligation', label: 'Obligation', kinds: ['obligation'] },
  { key: 'personal', label: 'Personal', kinds: ['enjoy', 'rest'] },
] as const satisfies readonly { key: string; label: string; kinds: readonly PlanKind[] | null }[];

export type PlanFilter = (typeof PLAN_FILTERS)[number]['key'];

const matches = (filter: PlanFilter) => (p: Plan) => {
  const kinds = PLAN_FILTERS.find((f) => f.key === filter)?.kinds;
  return !kinds || (kinds as readonly PlanKind[]).includes(p.kind);
};

const inWeek = (p: Plan) => isoDay(p.start) >= week.start && isoDay(p.start) <= week.end;

export const plansThisWeek = (filter: PlanFilter) => plans.filter(inWeek).filter(matches(filter));

/** The rest of this week; the Plans screen is scoped to the week in its header. */
export const upcoming = (filter: PlanFilter) =>
  plans
    .filter(inWeek)
    .filter(matches(filter))
    .filter((p) => p.start >= NOW)
    .sort((a, b) => a.start.localeCompare(b.start));
