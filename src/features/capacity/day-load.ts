import { DAY_ROOM } from '../../../packages/core/src';
import type { Plan } from '@/features/plans/types';

export function dayLoad(plans: Plan[]): number {
  return plans
    // Counts like the API's day_scores: plans you're going to, moved ones included; not invites you
    // haven't answered (proposed) or declined.
    .filter((p) => p.status === 'accepted' || p.status === 'moved')
    .reduce((sum, p) => sum + p.energyCost, 0);
}

export function isOverflowing(plans: Plan[]): boolean {
  return dayLoad(plans) > DAY_ROOM;
}
