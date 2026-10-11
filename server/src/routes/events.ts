import { PLAN_KINDS, UNSORTED_KIND } from '@fobo/core/options';
import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import { withService, withUser, type Db } from '../db.ts';
import { accessToken, deleteEvent, getEvent, insertEvent, patchEvent, type GoogleEvent } from '../google.ts';
import { HttpError, route } from '../http.ts';
import { calendarConnections, events, profiles } from '../schema.ts';
import { googleAccount } from '../sync.ts';

// The owner's timezone, for turning stored instants into the app's local wall-clock strings.
const ownerTz = sql`(select timezone from profiles where id = ${events.userId})`;
const local = (instant: unknown) => sql<string>`to_char(${instant} at time zone ${ownerTz}, 'YYYY-MM-DD"T"HH24:MI')`;

// Plans are stored in events (time as a tstzrange) and served in the app's Plan shape
// (src/features/plans/types.ts): start and end as the owner's local time, '2026-10-05T09:00'.
// Plus visibility for the three friend-sharing levels, and the plan detail notes.
export const planColumns = {
  id: events.id,
  title: events.title,
  kind: sql<string>`coalesce(${events.category}, ${UNSORTED_KIND})`,
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
  notes: events.notes,
};

// App field -> column.
const FIELDS = {
  title: 'title', kind: 'category', energyCost: 'cost', status: 'status', visibility: 'visibility',
  leaveBy: 'leaveBy', with: 'withPeople', protected: 'protected', costNote: 'costNote', exitNote: 'exitNote',
  reminder: 'reminder', notes: 'notes',
} as const;
// Title and time belong to Google Calendar: changing them writes there first (writeToGoogle).
const GOOGLE_LOCKED = new Set(['title', 'start', 'end']);

// A time from the app: local wall-clock ('2026-10-05T09:00') is read in the user's timezone; a time
// with an offset or Z is taken as given.
export function instant(value: unknown, userId: string) {
  if (/([zZ]|[+-]\d\d:?\d\d)$/.test(String(value))) return sql`(${value}::timestamptz)`;
  return sql`(${value}::timestamp at time zone (select timezone from profiles where id = ${userId}))`;
}

export const range = (start: unknown, end: unknown, userId: string) =>
  sql`tstzrange(${instant(start, userId)}, ${instant(end, userId)})`;

const KINDS: readonly string[] = PLAN_KINDS;

// "shared" is the app's on/off switch; on means busy (block and colour, no title).
function normalize(body: Record<string, unknown>) {
  if (body.kind !== undefined && body.kind !== null && !KINDS.includes(String(body.kind))) {
    throw new HttpError(400, `kind is one of ${PLAN_KINDS.join(', ')}`);
  }
  const out = { ...body };
  if (typeof out.shared === 'boolean' && out.visibility === undefined) {
    out.visibility = out.shared ? 'busy' : 'private';
  }
  return out;
}

type GoogleRef = { externalId: string | null; calendarId: string | null; connectionId: string | null };

// Renames or moves the event in Google Calendar, when its account allows write-back. Local times are sent
// with the user's timezone.
async function writeToGoogle(pool: pg.Pool, userId: string, ev: GoogleRef, body: Record<string, unknown>) {
  const { account, writeBack, tz } = await withService(pool, async (db) => {
    const conn = ev.connectionId
      ? (await db.select({ writeBack: calendarConnections.writeBack }).from(calendarConnections)
        .where(eq(calendarConnections.id, ev.connectionId)))[0]
      : undefined;
    const me = (await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.id, userId)))[0];
    return { account: await googleAccount(db, userId), writeBack: !!conn?.writeBack, tz: me?.tz };
  });
  if (!account || !writeBack || !ev.externalId) {
    throw new HttpError(400, 'This plan comes from Google Calendar. Change its name or time there.');
  }
  const at = (t: unknown) => {
    const s = String(t);
    return /([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? { dateTime: s } : { dateTime: s.length === 16 ? `${s}:00` : s, timeZone: tz };
  };
  const timed = body.start !== undefined && body.end !== undefined;
  try {
    await patchEvent(await accessToken(account.refresh_token), ev.calendarId ?? 'primary', ev.externalId, {
      ...(typeof body.title === 'string' ? { summary: body.title } : {}),
      ...(timed ? { start: at(body.start), end: at(body.end) } : {}),
    });
  } catch (e) {
    // Usually an invite someone else organises: only they can rename or move it.
    console.warn('google calendar edit refused', ev.externalId, e);
    throw new HttpError(400, "Google Calendar didn't take that change. If someone else made this event, only they can rename or move it.");
  }
}

// Fobo's own plans go on the person's Google Calendar once they're going (made, or said yes to after
// weighing), as an event Google sends to the friends on it, with the plan's notes as its description.
// Fobo stays the owner: its later changes and removal follow. Best effort: the plan stands when Google
// says no.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function googleFor(db: Db, userId: string) {
  const account = await googleAccount(db, userId);
  if (!account) return null;
  const conn = (await db.select({ id: calendarConnections.id }).from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.writeBack, true))).limit(1))[0];
  if (!conn) return null;
  const tz = (await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.id, userId)))[0]?.tz ?? 'UTC';
  return { access: await accessToken(account.refresh_token), tz, connectionId: conn.id };
}

// Who Google invites: friends on the plan, by the address they signed in with (Google's, which it
// verified, first), and any address typed into it. Names alone can't be invited.
async function guests(db: Db, userId: string, people: string[]) {
  const typed = people.filter((p) => EMAIL.test(p));
  const ids = people.filter((p) => !EMAIL.test(p));
  const { rows } = ids.length ? await db.execute<{ email: string | null }>(sql`
    select coalesce(nullif(g.email, ''), e.email) as email
    from jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb) as w(id)
    left join google_accounts g on g.user_id = w.id
    left join email_accounts e on e.user_id = w.id
    where exists (select 1 from friendships f where f.status = 'accepted'
      and ((f.requester_id = ${userId} and f.addressee_id = w.id) or (f.addressee_id = ${userId} and f.requester_id = w.id)))`) : { rows: [] };
  return [...new Set([...typed, ...rows.flatMap((r) => (r.email ? [r.email] : []))].map((e) => e.toLowerCase()))];
}

const at = (local: string, tz: string) => ({ dateTime: `${local}:00`, timeZone: tz });

const mirrored = { ...planColumns, externalId: events.externalId, calendarId: events.calendarId };

// After a Fobo plan is made or changed: put it on Google Calendar once it's going, or bring the Google
// event in line with what changed (`body`, the app's fields).
async function toGoogle(pool: pg.Pool, userId: string, id: string, body: Record<string, unknown> = {}) {
  const ready = await withService(pool, async (db) => {
    const plan = (await db.select(mirrored).from(events).where(and(eq(events.id, id), eq(events.userId, userId))))[0];
    if (!plan || plan.source !== 'capacity') return null;
    if (!plan.externalId && plan.status !== 'accepted') return null;
    const google = await googleFor(db, userId);
    if (!google) return null;
    if (plan.externalId) return { google, plan, emails: 'with' in body ? await guests(db, userId, plan.with) : null };
    // The event takes the plan's id (Google allows 0-9 and a-v), claimed here first, so a sync that runs
    // while Google answers updates this plan instead of bringing the event in as a second one.
    const externalId = id.replaceAll('-', '');
    await db.update(events).set({ connectionId: google.connectionId, calendarId: 'primary', externalId }).where(eq(events.id, id));
    return { google, plan: { ...plan, externalId, calendarId: 'primary' }, emails: await guests(db, userId, plan.with), insert: true };
  });
  if (!ready) return;
  const { google, plan, emails } = ready;
  const cal = plan.calendarId ?? 'primary';
  try {
    if ('insert' in ready) {
      await insertEvent(google.access, cal, {
        id: plan.externalId!,
        summary: plan.title,
        ...(plan.notes ? { description: plan.notes } : {}),
        start: at(plan.start, google.tz),
        end: at(plan.end, google.tz),
        attendees: emails!.map((email) => ({ email })),
      }, true);
      return;
    }
    const patch: Partial<GoogleEvent> = {
      ...('title' in body ? { summary: plan.title } : {}),
      ...('notes' in body ? { description: plan.notes ?? '' } : {}),
      ...(body.start !== undefined && body.end !== undefined ? { start: at(plan.start, google.tz), end: at(plan.end, google.tz) } : {}),
    };
    if (emails) {
      // Guests still on the plan keep their answers; new ones are invited, removed ones are told.
      const current = (await getEvent(google.access, cal, plan.externalId!)).attendees ?? [];
      const keep = current.filter((a) => a.self || emails.includes(a.email.toLowerCase()));
      patch.attendees = [...keep, ...emails.filter((e) => !keep.some((a) => a.email.toLowerCase() === e)).map((email) => ({ email }))];
    }
    if (Object.keys(patch).length) await patchEvent(google.access, cal, plan.externalId!, patch);
  } catch (e) {
    console.warn('google calendar write failed', id, e);
    // A plan Google never took is free to try again on its next change.
    if ('insert' in ready) {
      await withService(pool, (db) => db.update(events).set({ connectionId: null, calendarId: null, externalId: null }).where(eq(events.id, id)));
    }
  }
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
      ...(plan.leaveBy ? { exit: { leaveBy: plan.leaveBy, ...(exitNote ? { note: exitNote } : {}) } } : {}),
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

  route('POST', '/plans', async ({ pool, claims, body: raw }) => {
    const body = normalize(raw);
    if (!body.title || !body.start || !body.end) throw new HttpError(400, 'title, start and end are required');
    const plan = await withUser(pool, claims, async (db) => {
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
        notes: (body.notes as string) ?? null,
      }).returning({ id: events.id });
      return planDetail(db, row.id);
    });
    await toGoogle(pool, claims.sub, plan.id);
    return plan;
  }),

  route('PATCH', '/plans/:id', async ({ pool, claims, params, body: raw }) => {
    const body = normalize(raw);
    const current = (await withUser(pool, claims, (db) => db.select({
      source: events.source, externalId: events.externalId, calendarId: events.calendarId, connectionId: events.connectionId,
      title: events.title, start: planColumns.start, end: planColumns.end,
    }).from(events).where(eq(events.id, params.id))))[0];
    if (!current) throw new HttpError(404, 'not found');
    if (current.source === 'google') {
      // The edit form sends the name and times every time: only real changes count as changing them.
      if (body.title === current.title) delete body.title;
      if (String(body.start ?? '').slice(0, 16) === current.start && String(body.end ?? '').slice(0, 16) === current.end) {
        delete body.start;
        delete body.end;
      }
      // A Google plan's new name or time goes to Google Calendar first, so the next sync agrees.
      if (Object.keys(body).some((k) => GOOGLE_LOCKED.has(k))) await writeToGoogle(pool, claims.sub, current, body);
    }
    await withUser(pool, claims, async (db) => {
      const timed = body.start !== undefined && body.end !== undefined;
      const fields = Object.keys(FIELDS).filter((k) => k in body) as (keyof typeof FIELDS)[];
      if (!fields.length && !timed) throw new HttpError(400, 'nothing to update');
      const set: Record<string, unknown> = Object.fromEntries(fields.map((k) => [FIELDS[k], body[k]]));
      if (timed) set.time = range(body.start, body.end, claims.sub);
      await db.update(events).set(set).where(eq(events.id, params.id));
    });
    if (current.source === 'capacity') await toGoogle(pool, claims.sub, params.id, body);
    return withUser(pool, claims, (db) => planDetail(db, params.id));
  }),

  // A plan from Google Calendar is declined (sync would bring it back); Fobo's own plans are removed, and
  // one that went on Google Calendar is cancelled there, which tells its guests.
  route('DELETE', '/plans/:id', async ({ pool, claims, params }) => {
    const current = await withUser(pool, claims, async (db) => {
      const row = (await db.select({ source: events.source, externalId: events.externalId, calendarId: events.calendarId })
        .from(events).where(eq(events.id, params.id)))[0];
      if (!row) throw new HttpError(404, 'not found');
      if (row.source === 'google') await db.update(events).set({ status: 'declined' }).where(eq(events.id, params.id));
      else await db.delete(events).where(eq(events.id, params.id));
      return row;
    });
    if (current.source !== 'capacity' || !current.externalId) return;
    const google = await withService(pool, (db) => googleFor(db, claims.sub));
    if (google) {
      await deleteEvent(google.access, current.calendarId ?? 'primary', current.externalId, true)
        .catch((e) => console.warn('google calendar cancel failed', params.id, e));
    }
  }),
];
