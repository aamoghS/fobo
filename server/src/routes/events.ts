import { asc, eq, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { events } from '../schema.ts';

// The owner's timezone, for turning stored instants into the app's local wall-clock strings.
const ownerTz = sql`(select timezone from profiles where id = ${events.userId})`;
const local = (instant: unknown) => sql<string>`to_char(${instant} at time zone ${ownerTz}, 'YYYY-MM-DD"T"HH24:MI')`;

// Plans are stored in events (time as a tstzrange) and served in the app's Plan shape
// (src/features/plans/types.ts): start and end as the owner's local time, '2026-10-05T09:00'.
// Plus visibility for the three friend-sharing levels, and the plan detail notes.
export const planColumns = {
  id: events.id,
  title: events.title,
  kind: sql<string>`coalesce(${events.category}, 'work')`,
  start: local(sql`lower(${events.time})`),
  end: local(sql`upper(${events.time})`),
  energyCost: events.cost,
  status: events.status,
  shared: sql<boolean>`${events.visibility} <> 'private'`,
  visibility: events.visibility,
  leaveBy: events.leaveBy,
  with: events.withPeople,
  protected: events.protected,
  source: events.source,
  costNote: events.costNote,
  exitNote: events.exitNote,
  reminder: events.reminder,
};

// App field -> column.
const FIELDS = {
  title: 'title', kind: 'category', energyCost: 'cost', status: 'status', visibility: 'visibility',
  leaveBy: 'leaveBy', with: 'withPeople', protected: 'protected', costNote: 'costNote', exitNote: 'exitNote',
  reminder: 'reminder',
} as const;
// Google keeps title and time; Fobo keeps the rest.
const GOOGLE_LOCKED = new Set(['title', 'start', 'end']);

// A time from the app: local wall-clock ('2026-10-05T09:00') is read in the user's timezone; a time
// with an offset or Z is taken as given.
export function instant(value: unknown, userId: string) {
  if (/([zZ]|[+-]\d\d:?\d\d)$/.test(String(value))) return sql`(${value}::timestamptz)`;
  return sql`(${value}::timestamp at time zone (select timezone from profiles where id = ${userId}))`;
}

export const range = (start: unknown, end: unknown, userId: string) =>
  sql`tstzrange(${instant(start, userId)}, ${instant(end, userId)})`;

// "shared" is the app's on/off switch; on means busy (block and colour, no title).
function normalize(body: Record<string, unknown>) {
  const out = { ...body };
  if (typeof out.shared === 'boolean' && out.visibility === undefined) {
    out.visibility = out.shared ? 'busy' : 'private';
  }
  return out;
}

async function onePlan(db: Db, id: string) {
  const row = (await db.select(planColumns).from(events).where(eq(events.id, id)))[0];
  if (!row) throw new HttpError(404, 'not found');
  return row;
}

// Plan detail adds the app's PlanDetail (src/data/plans.ts): costNote, exit, reminder.
export async function planDetail(db: Db, id: string) {
  const { costNote, exitNote, reminder, ...plan } = await onePlan(db, id);
  return {
    ...plan,
    costNote,
    exitNote,
    reminder,
    detail: {
      ...(costNote ? { costNote } : {}),
      ...(exitNote && plan.leaveBy ? { exit: { leaveBy: plan.leaveBy, note: exitNote } } : {}),
      ...(reminder ? { reminder } : {}),
    },
  };
}

export const eventRoutes = [
  route('GET', '/plans', ({ pool, claims, query }) => {
    const from = query.get('from');
    const to = query.get('to');
    if (!from || !to) throw new HttpError(400, 'from and to are required');
    return withUser(pool, claims, (db) =>
      db.select(planColumns).from(events)
        .where(sql`${events.time} && ${range(from, to, claims.sub)}`)
        .orderBy(asc(sql`lower(${events.time})`)));
  }),

  route('GET', '/plans/:id', ({ pool, claims, params }) => withUser(pool, claims, (db) => planDetail(db, params.id))),

  route('POST', '/plans', ({ pool, claims, body: raw }) => {
    const body = normalize(raw);
    if (!body.title || !body.start || !body.end) throw new HttpError(400, 'title, start and end are required');
    return withUser(pool, claims, async (db) => {
      const [row] = await db.insert(events).values({
        userId: claims.sub,
        title: String(body.title),
        time: range(body.start, body.end, claims.sub) as unknown as string,
        category: (body.kind as string) ?? null,
        cost: (body.energyCost as number) ?? 0,
        status: (body.status as string) ?? 'accepted',
        visibility: (body.visibility as string) ?? 'busy',
        leaveBy: (body.leaveBy as string) ?? null,
        withPeople: (body.with as string[]) ?? [],
        protected: (body.protected as boolean) ?? false,
        costNote: (body.costNote as string) ?? null,
        exitNote: (body.exitNote as string) ?? null,
        reminder: (body.reminder as string) ?? null,
      }).returning({ id: events.id });
      return planDetail(db, row.id);
    });
  }),

  route('PATCH', '/plans/:id', ({ pool, claims, params, body: raw }) =>
    withUser(pool, claims, async (db) => {
      const body = normalize(raw);
      const current = (await db.select({ source: events.source }).from(events).where(eq(events.id, params.id)))[0];
      if (!current) throw new HttpError(404, 'not found');
      if (current.source === 'google' && Object.keys(body).some((k) => GOOGLE_LOCKED.has(k))) {
        throw new HttpError(400, 'title and time come from Google Calendar');
      }
      const timed = body.start !== undefined && body.end !== undefined;
      const fields = Object.keys(FIELDS).filter((k) => k in body) as (keyof typeof FIELDS)[];
      if (!fields.length && !timed) throw new HttpError(400, 'nothing to update');
      const set: Record<string, unknown> = Object.fromEntries(fields.map((k) => [FIELDS[k], body[k]]));
      if (timed) set.time = range(body.start, body.end, claims.sub);
      await db.update(events).set(set).where(eq(events.id, params.id));
      return planDetail(db, params.id);
    })),
];
