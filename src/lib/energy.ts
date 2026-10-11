import { dayLoad } from '@/features/capacity/day-load';
import type { Plan } from '@/features/plans/types';
import { DAY_ROOM } from '../../packages/core/src';

export type Mood = 'bright' | 'fine' | 'stretched' | 'spent' | 'asleep';

/** A plan's starting cost from its length, as Google Calendar plans get on sync: half a point an hour, 0.5 to 5. */
export function costFromLength(start: string, end: string) {
  const hours = (Date.parse(end) - Date.parse(start)) / 36e5;
  return Math.min(5, Math.max(0.5, Math.round(hours) / 2));
}

/** 1 to 3 energy drops for a plan's cost out of DAY_ROOM. */
export function energyDrops(cost: number): 1 | 2 | 3 {
  if (cost <= 2) return 1;
  if (cost <= 3.5) return 2;
  return 3;
}

/** The face the top scrap of a day wears on the week shelf. */
export function dayMood(dayPlans: Plan[], isPast: boolean): Mood {
  if (isPast) return 'asleep';
  const load = dayLoad(dayPlans);
  if (load >= DAY_ROOM) return 'spent';
  if (load >= DAY_ROOM * 0.85) return 'stretched';
  if (dayPlans.some((p) => p.kind === 'rest') && load <= DAY_ROOM * 0.3) return 'asleep';
  return 'fine';
}
