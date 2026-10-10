// "Fix my week": asks Gemini for the smallest set of changes that fits every day in DAY_ROOM.
// The server checks every change and computes scores itself; nothing applies until apply-fix.
import { DAY_ROOM, dayLoads } from './time.ts';

// Override with GEMINI_MODEL.
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
const CATEGORIES = ['work', 'social', 'obligation', 'rest', 'enjoy'];
const OPS = ['move', 'shorten', 'decline', 'add_rest', 'protect'];

export const SYSTEM = `You are the planner inside Fobo, an app that treats a person's energy as a budget.
Every day has ${DAY_ROOM} units of room. Each plan has a cost from -1 to ${DAY_ROOM} (rest gives back 1).
A day above ${DAY_ROOM} is over the line. Consecutive days at 8 or more are "full"; the person's
profile says how many full days in a row they are comfortable with (busy_streak).

You get the person's profile, what they have learned from past check-ins, and their plans.
Do two things:

1. classify: for every plan whose category is null, give category and cost. Use the profile:
   plans that drain this person cost more, plans that recharge them cost less. Lean on the
   check-in memories when the same kind of plan or person appears.

2. changes: the smallest set of edits that brings every day to ${DAY_ROOM} or under and
   breaks full-day runs longer than busy_streak. Ops:
   - move: new starts_at and ends_at for a plan
   - shorten: new ends_at for a plan
   - decline: drop a plan
   - add_rest: a new protected rest block (title, starts_at, ends_at)
   - protect: mark an existing plan as protected time
   Rules: never touch protected plans. Only move plans with no other people; plans with others
   can be shortened or declined. Never schedule over another plan. Keep times on the same UTC
   offset you were given. If the week already fits, return no changes and say so.

summary: one or two plain sentences to the person, second person, no jargon, no scores.
Each change.reason: one short sentence the person will read.`;

// Gemini's response schema (OpenAPI subset: nullable instead of a null type).
const str = { type: 'string' };
const nullableStr = { type: 'string', nullable: true };
export const SCHEMA = {
  type: 'object',
  required: ['summary', 'classify', 'changes'],
  properties: {
    summary: str,
    classify: {
      type: 'array',
      items: {
        type: 'object',
        required: ['event_id', 'category', 'cost'],
        properties: { event_id: str, category: { type: 'string', enum: CATEGORIES }, cost: { type: 'integer' } },
      },
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['op', 'event_id', 'starts_at', 'ends_at', 'title', 'reason'],
        properties: {
          op: { type: 'string', enum: OPS },
          event_id: nullableStr, starts_at: nullableStr, ends_at: nullableStr, title: nullableStr,
          reason: str,
        },
      },
    },
  },
};

export interface Change {
  op: 'move' | 'shorten' | 'decline' | 'add_rest' | 'protect';
  event_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  title: string | null;
  reason: string;
}

export interface Answer {
  summary: string;
  classify: { event_id: string; category: string; cost: number }[];
  changes: Change[];
}

export interface PlanRow {
  id: string;
  starts_at: string;
  ends_at: string;
  cost: number | null;
  category: string | null;
  protected: boolean;
  declined: boolean;
  with_people: string[];
}

export class PlannerError extends Error {}

// Sends the input to the planner model and returns its parsed answer. Swapped out in tests.
export type Ask = (input: unknown) => Promise<Answer>;

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const askGemini: Ask = async (input) => {
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(`${API}/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 16000 },
    }),
  });
  if (!res.ok) throw new PlannerError(`the planner is unavailable (${res.status})`);
  const data = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const c = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || c?.finishReason === 'SAFETY') {
    throw new PlannerError('the planner declined this request');
  }
  if (c?.finishReason === 'MAX_TOKENS') throw new PlannerError('the planner answer was cut off');
  const text = c?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new PlannerError('the planner returned no answer');
  return checkAnswer(JSON.parse(text));
};

// Structured output already follows SCHEMA; this guards the shape before anything trusts it.
export function checkAnswer(a: any): Answer {
  const ok = a && typeof a.summary === 'string' && Array.isArray(a.classify) && Array.isArray(a.changes)
    && a.changes.every((c: any) => OPS.includes(c?.op) && typeof c.reason === 'string')
    && a.classify.every((k: any) => typeof k?.event_id === 'string' && CATEGORIES.includes(k.category)
      && Number.isInteger(k.cost));
  if (!ok) throw new PlannerError('the planner answer did not match the schema');
  return a;
}

// Drops changes that point at a plan that was not sent, touch a protected plan, move a plan
// with other people, or lack the times they need.
export function allowedChanges(changes: Change[], plans: PlanRow[]): Change[] {
  const byId = new Map(plans.map((p) => [p.id, p]));
  return changes.filter((c) => {
    if (c.op === 'add_rest') return !!(c.starts_at && c.ends_at && c.title);
    const p = c.event_id ? byId.get(c.event_id) : undefined;
    if (!p || p.protected) return false;
    if (c.op === 'move') return !!(c.starts_at && c.ends_at) && p.with_people.length === 0;
    if (c.op === 'shorten') return !!c.ends_at;
    return true;
  });
}

// Each day's load before and after the changes, computed here rather than taken from the model.
export function scoreDays(plans: PlanRow[], changes: Change[], tz: string) {
  const after: PlanRow[] = plans.map((p) => ({ ...p }));
  for (const c of changes) {
    const p = after.find((x) => x.id === c.event_id);
    if (c.op === 'decline' && p) p.declined = true;
    if (c.op === 'move' && p) p.starts_at = c.starts_at!;
    if (c.op === 'add_rest') {
      after.push({ id: '', starts_at: c.starts_at!, ends_at: c.ends_at!, cost: -1, category: 'rest',
        protected: true, declined: false, with_people: [] });
    }
  }
  const b = dayLoads(plans, tz);
  const a = dayLoads(after, tz);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].sort()
    .map((date) => ({ date, before: b[date] ?? 0, after: a[date] ?? 0, room: DAY_ROOM }));
}
