import { DAY_ROOM } from '../../../packages/core/src';
import type { Plan } from '@/features/plans/types';

export function dayLoad(plans: Plan[]): number {
  const total = plans
    // Counts like the API's day_scores: plans you're going to, moved ones included; not invites you
    // haven't answered (proposed) or declined.
    .filter((p) => p.status === 'accepted' || p.status === 'moved')
    .reduce((sum, p) => sum + p.energyCost, 0);
  // Also like day_scores, so your day reads as friends see it: never below 0 (rest can cost less than
  // nothing), in tenths without float noise (0.1 + 0.2).
  return Math.max(0, Math.round(total * 10) / 10);
}

export function isOverflowing(plans: Plan[]): boolean {
  return dayLoad(plans) > DAY_ROOM;
}
