import type { PlanKind } from '@/features/plans/types';

/** Invites you haven't accepted yet, shown on Weigh a plan. Content from Tory's Weigh a plan mockup. */
export type Invite = {
  id: string;
  title: string;
  kind: PlanKind;
  start: string;
  /** Who it's with, as the row words it ("Dani + 2", "Work"). */
  with: string;
  /** The little character on the row. */
  character: { cut: 'social' | 'work'; face: 'fine' | 'asleep' } | 'sun';
};

export const invites: Invite[] = [
  { id: 'invite-comal', title: 'Dinner at Comal', kind: 'social', start: '2026-10-10T19:00', with: 'Dani + 2', character: { cut: 'social', face: 'fine' } },
  { id: 'invite-jun-coffee', title: 'Coffee with Jun', kind: 'enjoy', start: '2026-10-11T10:00', with: 'Jun', character: 'sun' },
  { id: 'invite-team-lunch', title: 'Team lunch', kind: 'work', start: '2026-10-12T12:00', with: 'Work', character: { cut: 'work', face: 'asleep' } },
];
