import { dayLoad } from '@/features/capacity/day-load';
import type { Plan } from '@/features/plans/types';
import { DAY_ROOM } from '../../packages/core/src';

export type Mood = 'bright' | 'fine' | 'stretched' | 'spent' | 'asleep';

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
