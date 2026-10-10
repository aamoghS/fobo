import { asc, eq, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { events } from '../schema.ts';

// Plans are stored in events (time as a tstzrange) and served in the app's Plan shape
// (src/features/plans/types.ts), plus visibility for the three friend-sharing levels.
export const planColumns = {
  id: events.id,
  title: events.title,
  kind: sql<string>`coalesce(${events.category}, 'work')`,
  start: sql<Date>`lower(${events.time})`,
  end: sql<Date>`upper(${events.time})`,
  energyCost: events.cost,
  status: events.status,
  shared: sql<boolean>`${events.visibility} <> 'private'`,
  visibility: events.visibility,
  leaveBy: events.leaveBy,
  with: events.withPeople,
  protected: events.protected,
  source: events.source,
};

// App field -> column.
const FIELDS = {
  title: 'title', kind: 'category', energyCost: 'cost', status: 'status', visibility: 'visibility',
  leaveBy: 'leaveBy', with: 'withPeople', protected: 'protected',
} as const;
// Google keeps title and time; Fobo keeps the rest.
const GOOGLE_LOCKED = new Set(['title', 'start', 'end']);

export const range = (start: unknown, end: unknown) => sql`tstzrange(${start}::timestamptz, ${end}::timestamptz)`;

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

export const eventRoutes = [
  route('GET', '/plans', ({ pool, claims, query }) => {
    const from = query.get('from');
    const to = query.get('to');
    if (!from || !to) throw new HttpError(400, 'from and to are required');
    return withUser(pool, claims, (db) =>
      db.select(planColumns).from(events)
        .where(sql`${events.time} && ${range(from, to)}`)
        .orderBy(asc(sql`lower(${events.time})`)));
  }),

  route('GET', '/plans/:id', ({ pool, claims, params }) => withUser(pool, claims, (db) => onePlan(db, params.id))),

  route('POST', '/plans', ({ pool, claims, body: raw }) => {
    const body = normalize(raw);
    if (!body.title || !body.start || !body.end) throw new HttpError(400, 'title, start and end are required');
    return withUser(pool, claims, async (db) => {
      const [row] = await db.insert(events).values({
        userId: claims.sub,
        title: String(body.title),
        time: range(body.start, body.end) as unknown as string,
        category: (body.kind as string) ?? null,
        cost: (body.energyCost as number) ?? 0,
        status: (body.status as string) ?? 'accepted',
        visibility: (body.visibility as string) ?? 'busy',
        leaveBy: (body.leaveBy as string) ?? null,
        withPeople: (body.with as string[]) ?? [],
        protected: (body.protected as boolean) ?? false,
      }).returning({ id: events.id });
      return onePlan(db, row.id);
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
      if (timed) set.time = range(body.start, body.end);
      await db.update(events).set(set).where(eq(events.id, params.id));
      return onePlan(db, params.id);
    })),
];
