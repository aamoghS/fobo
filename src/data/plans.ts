import type { Plan } from '@/features/plans/types';

/**
 * Mock week, 5–11 October 2026. Titled plans and their copy come from the Final screens
 * (Plans · Social 442:2461, Event 368:9064). Plans titled after their kind only fill the
 * Your week shelf (439:2323) so the stacks match; Figma never lists them.
 */
export const plans: Plan[] = [
  // Mon 5 (past)
  plan('mon-work', 'Work', 'work', '2026-10-05T09:00', '2026-10-05T13:00', 3.5),
  plan('mon-obligation', 'Obligation', 'obligation', '2026-10-05T17:00', '2026-10-05T18:30', 2.5),
  // Tue 6 (past)
  plan('tue-work', 'Work', 'work', '2026-10-06T09:00', '2026-10-06T16:00', 5.5),
  plan('tue-obligation', 'Obligation', 'obligation', '2026-10-06T18:00', '2026-10-06T19:30', 3),
  // Wed 7 (today)
  plan('wed-standup', 'Work', 'work', '2026-10-07T08:30', '2026-10-07T09:00', 1),
  plan('wed-review', 'Work', 'work', '2026-10-07T11:00', '2026-10-07T12:30', 2),
  plan('wed-workshop', 'Work', 'work', '2026-10-07T14:00', '2026-10-07T17:00', 3),
  plan('wed-enjoy', 'Enjoy', 'enjoy', '2026-10-07T19:00', '2026-10-07T21:00', 2),
  // Thu 8
  plan('thu-work', 'Work', 'work', '2026-10-08T09:00', '2026-10-08T16:00', 5.5),
  plan('lea-parents', 'Dinner with Lea’s parents', 'social', '2026-10-08T19:00', '2026-10-08T21:30', 4),
  // Fri 9
  plan('hackathon', 'Event', 'work', '2026-10-09T07:00', '2026-10-09T11:00', 6),
  plan('offsite-drinks', 'Offsite drinks', 'social', '2026-10-09T17:30', '2026-10-09T19:00', 3),
  // Sat 10
  plan('sat-obligation', 'Obligation', 'obligation', '2026-10-10T09:00', '2026-10-10T12:00', 5),
  plan('ava-brunch', 'Ava’s birthday brunch', 'social', '2026-10-10T13:30', '2026-10-10T15:00', 3),
  // "Dani + 2" on People; Jun lists it under Next together.
  { ...plan('comal', 'Dinner at Comal', 'social', '2026-10-10T19:00', '2026-10-10T20:30', 2), leaveBy: '8:30', with: ['dani', 'jun', 'lea'] },
  // Sun 11
  plan('sun-rest', 'Rest', 'rest', '2026-10-11T10:00', '2026-10-11T12:00', 0),
  plan('sun-obligation', 'Obligation', 'obligation', '2026-10-11T15:00', '2026-10-11T16:00', 2),
];

/** Extra copy for the Event detail screen (368:9064). Only the hackathon has it in Figma. */
export const planDetails: Record<string, PlanDetail> = {
  hackathon: {
    costNote: 'Four hours, a loud room, and a 7am start. Fridays like this usually leave you spent by 3.',
    exit: { leaveBy: '10:30', note: 'Keeps the afternoon for Josh and matcha · reminder at 10:15' },
    reminder: '30 minutes before',
    people: { names: 'Josh, Priya and the team', insight: 'Hackathons with Josh felt energizing 2 of 3 times' },
  },
};

export type PlanDetail = {
  costNote?: string;
  exit?: { leaveBy: string; note: string };
  reminder?: string;
  people?: { names: string; insight?: string };
};

export const getPlan = (id: string) => plans.find((p) => p.id === id);

function plan(
  id: string,
  title: string,
  kind: Plan['kind'],
  start: string,
  end: string,
  energyCost: number,
): Plan {
  return { id, title, kind, start, end, energyCost, status: 'accepted', shared: kind === 'social' };
}
