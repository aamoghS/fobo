// "Weigh a plan": asks Gemini what one plan will take out of the person, from their profile, what they
// have learned, and the plans around it. The server checks the answer and works out the day's load itself.
import { PLAN_KINDS } from '@fobo/core/options';
import { generate, PlannerError } from './planner.ts';
import { DAY_ROOM } from './time.ts';

const KINDS: readonly string[] = PLAN_KINDS;

const SYSTEM = `You weigh one plan inside Fobo, an app that treats a person's energy as a budget.
Every day has ${DAY_ROOM} units of room. A plan costs 0 to ${DAY_ROOM}; most plans cost 1 to 6.

You get: now (the person's local time), their profile (how they recharge, when they start wanting to
head home from a group, how long they take to recover), memories from past check-ins, their plans for
the next two weeks, and either a plan from their calendar or the text of a plan or invite they are
thinking about saying yes to.

Return:
- title: a short name for the plan, as the person would write it.
- kind: work, social, obligation, enjoy or rest.
- starts_at, ends_at: local time, 'YYYY-MM-DDTHH:MM'. For a calendar plan, copy its times. For text:
  with no day given, the next day it fits; with no time, a usual time for that kind of plan; with no
  end, a usual length.
- with: the other people's names, as written. Empty if none.
- cost: what this plan will take out of this person, 0 to ${DAY_ROOM}, in halves. Plans that drain them
  cost more (big groups for someone who recharges alone, a late night before a full day); plans that
  recharge them cost less. Lean on the memories when the same kind of plan or person appears.
- reason: one or two short sentences to the person about why it costs that. Second person, plain
  words, no numbers, no em dashes.
- leave_by: when the plan runs past the point the profile says they fade, or the day would go over
  ${DAY_ROOM}, a local 'HH:MM' inside the plan when leaving keeps them okay. Otherwise null.
- leave_reason: one short sentence on why that time, or null.`;

const str = { type: 'string' };
const nullableStr = { type: 'string', nullable: true };
const SCHEMA = {
  type: 'object',
  required: ['title', 'kind', 'starts_at', 'ends_at', 'with', 'cost', 'reason', 'leave_by', 'leave_reason'],
  properties: {
    title: str,
    kind: { type: 'string', enum: [...KINDS] },
    starts_at: str,
    ends_at: str,
    with: { type: 'array', items: str },
    cost: { type: 'number' },
    reason: str,
    leave_by: nullableStr,
    leave_reason: nullableStr,
  },
};

export interface Weighed {
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  with: string[];
  cost: number;
  reason: string;
  leave_by: string | null;
  leave_reason: string | null;
}

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;

export async function weighPlan(input: unknown): Promise<Weighed> {
  const a = await generate(SYSTEM, SCHEMA, input);
  const ok = a && typeof a.title === 'string' && a.title.trim() && KINDS.includes(a.kind)
    && LOCAL.test(a.starts_at) && LOCAL.test(a.ends_at) && Array.isArray(a.with)
    && typeof a.cost === 'number' && Number.isFinite(a.cost) && typeof a.reason === 'string';
  if (!ok) throw new PlannerError('the planner answer did not match the schema');
  // A plan that ends before it starts runs for an hour; the cost is kept to the room, in halves.
  const ends = a.ends_at > a.starts_at ? a.ends_at : null;
  const leave = typeof a.leave_by === 'string' && CLOCK.test(a.leave_by) ? `${a.starts_at.slice(0, 10)}T${a.leave_by}` : null;
  return {
    title: a.title.trim().slice(0, 120),
    kind: a.kind,
    starts_at: a.starts_at,
    ends_at: ends ?? plusHour(a.starts_at),
    with: a.with.filter((w: unknown) => typeof w === 'string' && w.trim()).map((w: string) => w.trim()).slice(0, 20),
    cost: Math.min(DAY_ROOM, Math.max(0, Math.round(a.cost * 2) / 2)),
    reason: a.reason.trim(),
    // Only a time inside the plan makes sense to leave at.
    leave_by: leave && leave > a.starts_at && leave < (ends ?? plusHour(a.starts_at)) ? a.leave_by : null,
    leave_reason: typeof a.leave_reason === 'string' ? a.leave_reason.trim() : null,
  };
}

function plusHour(local: string) {
  const d = new Date(`${local}:00Z`);
  d.setUTCHours(d.getUTCHours() + 1);
  return d.toISOString().slice(0, 16);
}
