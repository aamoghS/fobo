// fobo-demo branch only: a sample week for recording the demo without an account.
// Fills the same modules src/data/live.ts fills from the API, dated around the current week, with
// "now" pinned to Wednesday 10:00 so the week reads mid-flight.
import type { Plan, PlanKind } from '@/features/plans/types';
import { refreshToday } from '@/lib/week';

import { inviteFrom, invites } from './invites';
import { people, type Person } from './people';
import { planDetails, plans, tentative, type PlanDetail } from './plans';
import { achievements, capacity, profile, widget } from './profile';
import { localDay, mondayOf, setNow, week } from './week';

const pad = (n: number) => String(n).padStart(2, '0');

/** A day of the demo week: 0 is this Monday, 7 next Monday. */
function day(offset: number) {
  const d = mondayOf();
  d.setDate(d.getDate() + offset);
  return localDay(d);
}

function plan(
  id: string,
  title: string,
  kind: PlanKind,
  offset: number,
  from: string,
  to: string,
  energyCost: number,
  extra: Partial<Plan> = {},
): Plan {
  return {
    id,
    title,
    kind,
    start: `${day(offset)}T${from}`,
    end: `${day(offset)}T${to}`,
    energyCost,
    status: 'accepted',
    shared: kind === 'social',
    ...extra,
  };
}

const PEOPLE: Person[] = [
  { id: 'dani', name: 'Dani', tint: 'tintButter', nextLabel: 'Dinner · Saturday', bio: 'Never met a dinner table they didn’t light up.', pastTogether: 6, character: { shape: 'flower', color: 'moodStretched', eyes: 'happy', height: 0.4 } },
  { id: 'jun', name: 'Jun', tint: 'tintSky', nextLabel: 'Coffee · Sunday', bio: 'Always up for a slow morning.', pastTogether: 3, character: { shape: 'square', color: 'scrapWork', eyes: 'bored', height: 0.3 } },
  { id: 'hana', name: 'Hana', tint: 'tintRose', nextLabel: 'No upcoming plans', bio: 'Happiest on a quiet night in.', pastTogether: 2, character: { shape: 'cloud', color: 'moodAsleep', eyes: 'sleepy', height: 0.2 } },
  { id: 'ava', name: 'Ava', tint: 'tintMint', nextLabel: 'Brunch · Saturday', bio: 'Will turn any catch-up into a walk.', pastTogether: 4, character: { shape: 'slab', color: 'moodFine', eyes: 'happy', height: 0.6 } },
  { id: 'lea', name: 'Lea', tint: 'tintPeach', nextLabel: 'Dinner · Thursday', bio: 'Keeps the long lunches going.', pastTogether: 9, character: { shape: 'drip', color: 'moodSpent', eyes: 'bored', height: 0.5 } },
];

function demoPlans(): Plan[] {
  return [
    // Mon (past)
    plan('mon-planning', 'Sprint planning', 'work', 0, '09:00', '13:00', 3.5),
    plan('mon-dentist', 'Dentist appointment', 'obligation', 0, '17:00', '18:30', 2.5),
    // Tue (past)
    plan('tue-onboarding', 'Client onboarding', 'work', 1, '09:00', '16:00', 5.5),
    plan('tue-groceries', 'Grocery run', 'obligation', 1, '18:00', '19:30', 3),
    // Wed (today)
    plan('wed-standup', 'Standup', 'work', 2, '08:30', '09:00', 1),
    plan('wed-review', 'Design review', 'work', 2, '11:00', '12:30', 2),
    plan('wed-workshop', 'Research workshop', 'work', 2, '14:00', '17:00', 3),
    plan('wed-walk', 'Evening walk', 'enjoy', 2, '19:00', '21:00', 2),
    // Thu
    plan('thu-strategy', 'Q3 strategy review', 'work', 3, '09:00', '16:00', 5.5),
    plan('lea-parents', 'Dinner with Lea’s parents', 'social', 3, '19:00', '21:30', 4, { with: ['lea'] }),
    // Fri
    plan('hackathon', 'Hackathon', 'work', 4, '07:00', '11:00', 6, { leaveBy: '10:30' }),
    plan('offsite-drinks', 'Offsite drinks', 'social', 4, '17:30', '19:00', 3),
    // Sat
    plan('help-lea-move', 'Help Lea move', 'obligation', 5, '09:00', '12:00', 5, { with: ['lea', 'jun'] }),
    plan('ava-brunch', 'Ava’s birthday brunch', 'social', 5, '13:30', '15:00', 3, { with: ['ava'] }),
    plan('comal', 'Dinner at Comal', 'social', 5, '19:00', '20:30', 2, { leaveBy: '8:30', with: ['dani', 'jun', 'lea'] }),
    // Sun
    plan('sun-slow', 'Slow morning', 'rest', 6, '10:00', '12:00', 0),
    plan('sun-prep', 'Laundry and meal prep', 'obligation', 6, '15:00', '16:00', 2),
    // Next week
    plan('jun-coffee', 'Coffee with Jun', 'social', 13, '10:00', '11:00', 1, { with: ['jun'], icon: 'cup' }),
    plan('next-standup', 'Standup', 'work', 7, '08:30', '09:00', 1),
    plan('next-review', 'Portfolio review', 'work', 8, '13:00', '15:00', 3),
  ];
}

/** Invites you haven't answered yet: Weigh a plan's Tentative plans. */
function demoTentative(): Plan[] {
  return [
    { ...plan('invite-karaoke', 'Karaoke with the team', 'social', 4, '20:00', '23:00', 4), status: 'proposed', with: ['ava', 'dani'] },
    { ...plan('invite-picnic', 'Picnic in the park', 'enjoy', 6, '13:00', '15:00', 1.5), status: 'proposed', with: ['hana'] },
    { ...plan('invite-lunch', 'Team lunch', 'work', 7, '12:00', '13:00', 2), status: 'proposed' },
  ];
}

const DETAILS: Record<string, PlanDetail> = {
  hackathon: {
    costNote: 'Four hours, a loud room, and a 7am start. Fridays like this usually leave you spent by 3.',
    exit: { leaveBy: '10:30', note: 'Keeps the afternoon for Josh and matcha · reminder at 10:15' },
    reminder: '30 minutes before',
    people: { names: 'Josh, Priya and the team', insight: 'Hackathons with Josh felt energizing 2 of 3 times' },
  },
  'mon-planning': { costNote: 'A long morning of estimates. Mondays like this usually feel fine by lunch.', reminder: '10 minutes before', people: { names: 'Priya and the product team' } },
  'mon-dentist': { costNote: 'Short, but it sits in your head all afternoon.', reminder: '1 hour before' },
  'tue-onboarding': {
    costNote: 'Seven hours of being on. Days like this leave you stretched by 4.',
    reminder: '15 minutes before',
    people: { names: 'Northwind’s team and Priya', insight: 'New clients felt draining 2 of 3 times' },
  },
  'tue-groceries': { costNote: 'Quick if you go with a list.', reminder: '30 minutes before' },
  'wed-standup': { costNote: 'Fifteen minutes that usually runs to thirty.', reminder: '5 minutes before', people: { names: 'The design team' } },
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
  'wed-walk': { costNote: 'Gives back more than it takes. Walks after long days usually leave you lighter.', reminder: '30 minutes before' },
  'thu-strategy': {
    costNote: 'A full day of numbers before dinner with Lea’s parents. This one adds up.',
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
    reminder: '30 minutes before',
    people: { names: 'Josh, Priya and the team', insight: 'Work drinks felt draining 2 of 3 times' },
  },
  'help-lea-move': {
    costNote: 'Three hours of boxes and stairs. Saturdays like this usually leave you tired by noon.',
    reminder: '1 hour before',
    people: { names: 'Lea and Jun' },
  },
  'ava-brunch': {
    costNote: 'A long table and lots of catching up.',
    reminder: '1 hour before',
    people: { names: 'Ava and friends', insight: 'Brunches with Ava felt energizing 3 of 3 times' },
  },
  comal: {
    costNote: 'Dinner with friends at the end of a full Saturday.',
    exit: { leaveBy: '8:30', note: 'Home before you run out · reminder at 8:15' },
    reminder: '1 hour before',
    people: { names: 'Dani, Jun and Lea', insight: 'Dinners with Dani felt energizing 3 of 4 times' },
  },
  'sun-slow': { costNote: 'Nothing planned on purpose. This one gives back.' },
  'sun-prep': { costNote: 'An hour that makes the week easier.', reminder: '30 minutes before' },
  'jun-coffee': {
    costNote: 'Slow and easy. Coffees with Jun rarely take much.',
    reminder: '30 minutes before',
    people: { names: 'Jun', insight: 'Mornings with Jun felt energizing 3 of 3 times' },
  },
  'invite-karaoke': { costNote: 'Late, loud and right after a full Friday.', people: { names: 'Ava, Dani and the team' } },
  'invite-picnic': { costNote: 'Outside and unhurried. Sundays like this usually give back.', people: { names: 'Hana' } },
};

const swap = <T,>(list: T[], items: T[]) => list.splice(0, list.length, ...items);

/** Fills the app with the demo week. */
export function loadDemo() {
  setNow(`${day(2)}T10:00`);
  refreshToday();
  swap(people, PEOPLE);
  swap(plans, demoPlans());
  swap(tentative, demoTentative());
  swap(invites, tentative.map((p) => inviteFrom(p, people)));
  for (const key of Object.keys(planDetails)) delete planDetails[key];
  Object.assign(planDetails, structuredClone(DETAILS));
  Object.assign(week, {
    start: day(0),
    end: day(6),
    personalHours: 2.5,
    upNext: { id: 'wed-review', title: 'Design review', when: `Today ${pad(11)}:00`, kind: 'work' },
  });
  Object.assign(profile, {
    name: 'Tory',
    title: 'Social Butterfly',
    email: 'tory@fobo.app',
    handle: 'tory',
    streak: { days: 5, of: profile.streak.of, title: '5 day streak!', detail: 'Maintained balanced energy!' },
  });
  swap(achievements, [
    { id: 'irish-goodbye', title: 'The Irish Goodbye', icon: 'home', badge: 'red' },
    { id: 'slow-steady', title: 'Slow and Steady', icon: 'snail', badge: 'pink' },
    { id: 'merrier', title: 'More the Merrier', icon: 'paper-airplane', badge: 'green' },
  ]);
  Object.assign(widget, { headline: 'Still fuel left in your tank', next: 'Design review · 11:00', nudge: 'Saturday is carrying a lot.' });
  swap(capacity, [
    { label: 'Recharge', value: 'Quiet nights in', step: 'recharge' },
    { label: 'Heads home', value: 'Around 9pm', step: 'head-home' },
    { label: 'Time for yourself', value: 'A few hours a week', step: 'yourself' },
  ]);
}
