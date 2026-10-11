import type { Plan } from '@/features/plans/types';

/** The signed-in user's plans, four weeks from this Monday, filled from the API by src/data/live.ts. */
export const plans: Plan[] = [];

/** Invites not answered yet and plans written on Weigh a plan: openable, but not part of the week. */
export const tentative: Plan[] = [];

/** Extra copy for the Event detail screen (368:9064), by plan id. */
export const planDetails: Record<string, PlanDetail> = {};

export type PlanDetail = {
  costNote?: string;
  /** The cost of staying the whole time, kept once an exit lowers the plan's cost. */
  fullCost?: number;
  exit?: { leaveBy: string; note?: string };
  reminder?: string;
  people?: { names: string; insight?: string };
};

export const getPlan = (id: string) => plans.find((p) => p.id === id) ?? tentative.find((p) => p.id === id);
