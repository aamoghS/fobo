import type { Plan, PlanKind } from '@/features/plans/types';

import type { Person } from './people';

/** Invites you haven't accepted yet, shown on Weigh a plan. Filled by src/data/live.ts from plans you haven't answered. */
export type Invite = {
  id: string;
  title: string;
  kind: PlanKind;
  start: string;
  /** Who it's with, as the row words it ("Dani + 2", "Work"). */
  with: string;
  /** The little character on the row. */
  character: { cut: 'social' | 'obligation'; face: 'fine' | 'asleep' } | 'sun';
};

export const invites: Invite[] = [];

const KIND_LABEL: Record<PlanKind, string> = {
  work: 'Work',
  social: 'Social',
  obligation: 'Obligation',
  enjoy: 'Enjoy',
  rest: 'Rest',
};

/** A plan you haven't answered, as Weigh a plan's row shows it (characters as in Tory's mockup). */
export function inviteFrom(plan: Plan, circle: Person[]): Invite {
  // People are friend ids for Fobo plans, and names or emails for Google invites.
  const names = (plan.with ?? []).map((w) => circle.find((p) => p.id === w)?.name ?? w.split('@')[0]);
  return {
    id: plan.id,
    title: plan.title,
    kind: plan.kind,
    start: plan.start,
    with: names.length ? (names.length > 1 ? `${names[0]} + ${names.length - 1}` : names[0]) : KIND_LABEL[plan.kind],
    character:
      plan.kind === 'social'
        ? { cut: 'social', face: 'fine' }
        : plan.kind === 'enjoy' || plan.kind === 'rest'
          ? 'sun'
          : { cut: 'obligation', face: 'asleep' },
  };
}
