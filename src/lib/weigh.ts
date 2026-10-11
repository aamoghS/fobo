import type { ShelfDay } from '@/components/WeekShelf';
import { plans } from '@/data/plans';
import { NOW } from '@/data/week';
import { dayLoad } from '@/features/capacity/day-load';
import type { Plan, PlanKind } from '@/features/plans/types';
import { DAY_ROOM } from '../../packages/core/src';

import { dayMood } from './energy';
import { daysBetween, isoDay, weekdayInitial } from './format';

/** Something being weighed: a tentative invite, or a plan written on Weigh a plan. */
export type Candidate = {
  id: string;
  title: string;
  kind: PlanKind;
  start: string;
  /** "Dani + 2", "Work". */
  with?: string;
  energyCost: number;
  /** A plan already on the week that this is, so it isn't counted twice. */
  replaces?: string;
};

export type Verdict = 'over' | 'full' | 'room';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Sunday to Saturday around a day. */
function weekOf(day: string) {
  const d = new Date(`${day}T00:00`);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return daysBetween(ymd(sunday), ymd(saturday));
}

export function asPlan(c: Candidate): Plan {
  const end = new Date(c.start);
  end.setHours(end.getHours() + 2);
  return {
    id: c.id,
    title: c.title,
    kind: c.kind,
    start: c.start,
    end: `${ymd(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    energyCost: c.energyCost,
    // Weighing asks "what if you said yes", so it counts like an accepted plan.
    status: 'accepted',
    shared: c.kind === 'social',
  };
}

/** The candidate's week as shelf days, with the candidate on its day once `added`. */
export function previewWeek(c: Candidate, added: boolean): ShelfDay[] {
  const target = isoDay(c.start);
  const today = isoDay(NOW);
  return weekOf(target).map((date) => {
    const dayPlans = plans
      .filter((p) => isoDay(p.start) === date && p.id !== c.replaces)
      .concat(added && date === target ? [asPlan(c)] : [])
      .sort((a, b) => a.start.localeCompare(b.start));
    const past = date < today;
    return { date, label: weekdayInitial(date), plans: dayPlans, mood: dayMood(dayPlans, past), past, selected: date === target };
  });
}

export function verdict(c: Candidate): Verdict {
  const day = isoDay(c.start);
  const load = dayLoad(plans.filter((p) => isoDay(p.start) === day && p.id !== c.replaces).concat(asPlan(c)));
  return load > DAY_ROOM ? 'over' : load === DAY_ROOM ? 'full' : 'room';
}
