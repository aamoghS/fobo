import { DAY_ROOM } from '../../../packages/core/src';
import type { Plan } from '@/features/plans/types';

export function dayLoad(plans: Plan[]): number {
  return plans
    .filter((p) => p.status === 'accepted')
    .reduce((sum, p) => sum + p.energyCost, 0);
}

export function isOverflowing(plans: Plan[]): boolean {
  return dayLoad(plans) > DAY_ROOM;
}
