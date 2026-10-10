import type { Plan } from '@/features/plans/types';

/**
 * Mock week, 5–11 October 2026. Titled plans and their copy come from the Final screens
 * (Plans · Social 442:2461, Event 368:9064). The rest fill the Your week shelf (439:2323) so the
 * stacks match; Figma never names them, so their names and details are sample copy.
 */
export const plans: Plan[] = [
  // Mon 5 (past)
  plan('mon-work', 'Sprint planning', 'work', '2026-10-05T09:00', '2026-10-05T13:00', 3.5),
  plan('mon-obligation', 'Dentist appointment', 'obligation', '2026-10-05T17:00', '2026-10-05T18:30', 2.5),
  // Tue 6 (past)
  plan('tue-work', 'Client onboarding', 'work', '2026-10-06T09:00', '2026-10-06T16:00', 5.5),
  plan('tue-obligation', 'Grocery run', 'obligation', '2026-10-06T18:00', '2026-10-06T19:30', 3),
  // Wed 7 (today)
  plan('wed-standup', 'Standup', 'work', '2026-10-07T08:30', '2026-10-07T09:00', 1),
  plan('wed-review', 'Design review', 'work', '2026-10-07T11:00', '2026-10-07T12:30', 2),
  plan('wed-workshop', 'Research workshop', 'work', '2026-10-07T14:00', '2026-10-07T17:00', 3),
  plan('wed-enjoy', 'Evening walk', 'enjoy', '2026-10-07T19:00', '2026-10-07T21:00', 2),
  // Thu 8
  plan('thu-work', 'Q3 strategy review', 'work', '2026-10-08T09:00', '2026-10-08T16:00', 5.5),
  plan('lea-parents', 'Dinner with Lea’s parents', 'social', '2026-10-08T19:00', '2026-10-08T21:30', 4),
  // Fri 9
  plan('hackathon', 'Event', 'work', '2026-10-09T07:00', '2026-10-09T11:00', 6),
  plan('offsite-drinks', 'Offsite drinks', 'social', '2026-10-09T17:30', '2026-10-09T19:00', 3),
  // Sat 10
  plan('sat-obligation', 'Help Lea move', 'obligation', '2026-10-10T09:00', '2026-10-10T12:00', 5),
  plan('ava-brunch', 'Ava’s birthday brunch', 'social', '2026-10-10T13:30', '2026-10-10T15:00', 3),
  // "Dani + 2" on People; Jun lists it under Next together.
  { ...plan('comal', 'Dinner at Comal', 'social', '2026-10-10T19:00', '2026-10-10T20:30', 2), leaveBy: '8:30', with: ['dani', 'jun', 'lea'] },
  // Sun 11
  plan('sun-rest', 'Slow morning', 'rest', '2026-10-11T10:00', '2026-10-11T12:00', 0),
  plan('sun-obligation', 'Laundry and meal prep', 'obligation', '2026-10-11T15:00', '2026-10-11T16:00', 2),
  // Next week. Jun's "Coffee · Sunday" (People 387:1456), the cup row on People detail (387:1613).
  { ...plan('jun-coffee', 'Coffee with Jun', 'social', '2026-10-18T10:00', '2026-10-18T11:00', 1), with: ['jun'], icon: 'cup' },
];

/** Extra copy for the Event detail screen (368:9064). Only the hackathon has it in Figma. */
export const planDetails: Record<string, PlanDetail> = {
  // From Figma (368:9064).
  hackathon: {
    costNote: 'Four hours, a loud room, and a 7am start. Fridays like this usually leave you spent by 3.',
    exit: { leaveBy: '10:30', note: 'Keeps the afternoon for Josh and matcha · reminder at 10:15' },
    reminder: '30 minutes before',
    people: { names: 'Josh, Priya and the team', insight: 'Hackathons with Josh felt energizing 2 of 3 times' },
  },
  // Sample copy for the rest of the week, in the same voice.
  'mon-work': {
    costNote: 'A long morning of estimates. Mondays like this usually feel fine by lunch.',
    reminder: '10 minutes before',
    people: { names: 'Priya and the product team' },
  },
  'mon-obligation': {
    costNote: 'Short, but it sits in your head all afternoon.',
    reminder: '1 hour before',
  },
  'tue-work': {
    costNote: 'Seven hours of being on. Days like this leave you stretched by 4.',
    exit: { leaveBy: '3:30', note: 'Hands the last half hour to Priya · reminder at 3:15' },
    reminder: '15 minutes before',
    people: { names: 'Northwind’s team and Priya', insight: 'New clients felt draining 2 of 3 times' },
  },
  'tue-obligation': {
    costNote: 'Quick if you go with a list.',
    reminder: '30 minutes before',
  },
  'wed-standup': {
    costNote: 'Fifteen minutes that usually runs to thirty.',
    reminder: '5 minutes before',
    people: { names: 'The design team' },
  },
  'wed-review': {
    costNote: 'Feedback on your flows. You usually leave these with energy to spare.',
    reminder: '10 minutes before',
    people: { names: 'Mara, Jonah and Priya', insight: 'Reviews with Mara felt energizing 3 of 4 times' },
  },
  'wed-workshop': {
    costNote: 'Three hours of synthesis right after lunch. The last hour tends to drag.',
    exit: { leaveBy: '4:30', note: 'Keeps a gap before your walk · reminder at 4:15' },
    reminder: '15 minutes before',
    people: { names: 'Jonah and two researchers' },
  },
  'wed-enjoy': {
    costNote: 'Gives back more than it takes. Walks after long days usually leave you lighter.',
    reminder: '30 minutes before',
  },
  'thu-work': {
    costNote: 'A full day of numbers before dinner with Lea’s parents. This one adds up.',
    exit: { leaveBy: '3:30', note: 'Gives you an hour before dinner · reminder at 3:15' },
    reminder: '30 minutes before',
    people: { names: 'Leadership and Priya', insight: 'Strategy days felt draining 3 of 4 times' },
  },
  'lea-parents': {
    costNote: 'Meeting the parents, after a full workday. Expect to be spent by the end.',
    exit: { leaveBy: '9:00', note: 'Still a long evening · reminder at 8:45' },
    reminder: '1 hour before',
    people: { names: 'Lea and her parents', insight: 'Evenings with Lea felt energizing 4 of 5 times' },
  },
  'offsite-drinks': {
    costNote: 'Right after the hackathon. One drink is plenty.',
    exit: { leaveBy: '6:30', note: 'An hour is enough to show up · reminder at 6:15' },
    reminder: '30 minutes before',
    people: { names: 'Josh, Priya and the team', insight: 'Work drinks felt draining 2 of 3 times' },
  },
  'sat-obligation': {
    costNote: 'Three hours of boxes and stairs. Saturdays like this usually leave you tired by noon.',
    exit: { leaveBy: '11:30', note: 'Leaves time to rest before brunch · reminder at 11:15' },
    reminder: '1 hour before',
    people: { names: 'Lea and Jun' },
  },
  'ava-brunch': {
    costNote: 'A long table and lots of catching up.',
    exit: { leaveBy: '2:30', note: 'Gives you a breather before Comal · reminder at 2:15' },
    reminder: '1 hour before',
    people: { names: 'Ava and friends', insight: 'Brunches with Ava felt energizing 3 of 3 times' },
  },
  comal: {
    costNote: 'Dinner with friends at the end of a full Saturday.',
    exit: { leaveBy: '8:30', note: 'Home before you run out · reminder at 8:15' },
    reminder: '1 hour before',
    people: { names: 'Dani, Jun and Lea', insight: 'Dinners with Dani felt energizing 3 of 4 times' },
  },
  'sun-rest': {
    costNote: 'Nothing planned on purpose. This one gives back.',
  },
  'sun-obligation': {
    costNote: 'An hour that makes the week easier.',
    reminder: '30 minutes before',
  },
  'jun-coffee': {
    costNote: 'Slow and easy. Coffees with Jun rarely take much.',
    reminder: '30 minutes before',
    people: { names: 'Jun', insight: 'Mornings with Jun felt energizing 3 of 3 times' },
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
