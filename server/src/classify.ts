import { PLAN_KINDS } from '@fobo/core/options';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from './db.ts';
import { generate, plannerReady } from './planner.ts';
import { events, profiles } from './schema.ts';

type Kind = (typeof PLAN_KINDS)[number];

// Plain words in a title that settle its kind, checked in this order (a "team dinner" is social, a
// "doctor's appointment" an obligation). Whole words, any case. A word beside a telling neighbour
// is skipped so a later kind can take it (a "pitch practice" is work, a "due date" no date).
const RULES: [Kind, RegExp][] = [
  ['obligation', /\b(dentist|doctor|dr\.?|appointment|appt|therapy|clinic|vet|dmv|bank|taxes?|bills?|errands?|laundry|groceries|grocery|chores?|cleaning|haircut|car service|oil change|deadline|exams?|midterms?|finals|final(?! [a-z])|jury|visa|passport|commute|(?<!google )drive(?!-in)|flight|travel|airport|pharmacy|rent|pay|meal prep)\b/i],
  ['social', /\b(dinner|brunch|drinks?|coffee|party|birthday|bday|wedding|hang ?out|hangout|(?<!due )date|bbq|potluck|game night|reunion|catch ?up|visit\w*|(?:with|call) (?:mom|dad)|family|volunteer\w*|church|tailgat\w*)\b/i],
  ['rest', /\b(nap|sleep|rest|meditat\w*|spa|massage|self[- ]care|day off|vacation|holiday|pto|recharge|quiet time|me time|netflix|tv|break)\b/i],
  ['enjoy', /\b(gym|workout|work out|yoga|pilates|(?<!dry )run|running|jog|hike|hiking|swim|climb\w*|leg day|arm day|cardio|strength|(?<!safety )training|upper body|lower body|full body|core|mobility|stretch\w*|walk|bike|cycling|movie|film|concert|show|museum|gallery|game(?! theory)|gaming|book club|hobby|paint\w*|draw\w*|music(?! theory)|guitar|piano|band|choir|orchestra|(?<!(?:pitch|interview|leetcode) )practice(?! talk)|spin|danc\w*|barre|zumba|basketball|soccer)\b/i],
  ['work', /\b(meeting|mtg|standup|stand-up|sync|1:1|one on one|retro\w*|review|sprint|planning|interview|call|presentation|demo|workshop|onboarding|office hours|shift|lecture|class|seminar|lab|study|homework|project|hackathon|architecture|debrief|wrap[- ]up|backlog|team|practice|training|dry run|rehearsal|recitation|discussion|quiz(?:zes)?|problem sets?|p-?sets?|hw\d*|assignments?|essays?|tutor\w*|career|showcase|google drive)\b/i],
];

// A meal on its own is a break; with people, it's social.
const MEAL = /\b(lunch|breakfast)\b/i;

/** A kind from the title (and whether anyone else is on it), or null when no word settles it. */
export function kindFromTitle(title: string, people = 0): Kind | null {
  if (MEAL.test(title)) return people > 0 ? 'social' : 'rest';
  for (const [kind, words] of RULES) if (words.test(title)) return kind;
  return null;
}

const SYSTEM = `You sort a person's calendar events into one kind each, for an app that budgets energy.
Kinds: work (jobs, school, meetings, study), social (time with friends or family), obligation
(appointments, errands, admin, chores), enjoy (hobbies, exercise, outings done for fun), rest
(time off to recharge). Use the title and who is there. Return every event id with its kind.`;

const SCHEMA = {
  type: 'object',
  properties: {
    kinds: {
      type: 'array',
      items: {
        type: 'object',
        properties: { event_id: { type: 'string' }, kind: { type: 'string', enum: [...PLAN_KINDS] } },
        required: ['event_id', 'kind'],
      },
    },
  },
  required: ['kinds'],
};

/**
 * Gives a kind to the user's plans that have none (fresh from Google Calendar), from the last month on.
 * Titles with a telling word are sorted here; the rest go to Gemini when it's set up. Plans it can't
 * place keep no kind (drawn as work), and are tried again on the next sync.
 */
export async function classifyUnsorted(db: Db, userId: string) {
  const unsorted = await db.select({ id: events.id, title: events.title, with: events.withPeople })
    .from(events)
    .where(and(eq(events.userId, userId), isNull(events.category), sql`upper(${events.time}) > now() - interval '35 days'`))
    .limit(200);
  if (!unsorted.length) return 0;

  const kinds = new Map<string, Kind>();
  const unclear: typeof unsorted = [];
  for (const p of unsorted) {
    const kind = kindFromTitle(p.title, p.with.length);
    if (kind) kinds.set(p.id, kind);
    else unclear.push(p);
  }

  if (unclear.length && plannerReady()) {
    try {
      const profile = (await db.select({ recharge: profiles.rechargeStyle }).from(profiles).where(eq(profiles.id, userId)))[0];
      const answer = await generate(SYSTEM, SCHEMA, {
        recharge_style: profile?.recharge ?? null,
        events: unclear.map((p) => ({ id: p.id, title: p.title, with_people: p.with.length })),
      });
      for (const k of answer?.kinds ?? []) {
        if (unclear.some((p) => p.id === k.event_id) && (PLAN_KINDS as readonly string[]).includes(k.kind)) kinds.set(k.event_id, k.kind);
      }
    } catch (e) {
      console.warn('classify: planner unavailable', e);
    }
  }

  for (const kind of PLAN_KINDS) {
    const ids = [...kinds].filter(([, k]) => k === kind).map(([id]) => id);
    // Only plans still unsorted: someone may have picked a kind in the meantime.
    if (ids.length) await db.update(events).set({ category: kind }).where(and(inArray(events.id, ids), isNull(events.category)));
  }
  return kinds.size;
}
