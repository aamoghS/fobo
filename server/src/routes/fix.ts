import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { withService, type Db } from '../db.ts';
import { accessToken, deleteEvent, getEvent, insertEvent, patchEvent } from '../google.ts';
import { HttpError, route } from '../http.ts';
import {
  allowedChanges, askGemini, PlannerError, scoreDays, type Change, type PlanRow,
} from '../planner.ts';
import { calendarConnections, calendarFixes, events, memories, profiles } from '../schema.ts';
import { googleAccount } from '../sync.ts';
import { DAY_ROOM, localIso } from '../time.ts';
import { range } from './events.ts';

const fixColumns = {
  id: calendarFixes.id, summary: calendarFixes.summary, changes: calendarFixes.changes,
  days: calendarFixes.days, status: calendarFixes.status,
};

export const fixRoutes = [
    // { days: 1..14 }: asks the planner and saves its answer as a proposed fix.
    route('POST', '/fix-calendar', ({ pool, claims, body }) => {
      if (!process.env.GEMINI_API_KEY) {
        throw new HttpError(503, "The planner isn't set up yet");
      }
      const days = Math.min(14, Math.max(1, Number(body.days) || 7));
      const from = new Date();
      const to = new Date(from.getTime() + days * 864e5);
      return withService(pool, async (db) => {
        const profile = (await db.select({
          timezone: profiles.timezone, rechargeStyle: profiles.rechargeStyle,
          busyStreak: profiles.busyStreak, protectedHours: profiles.protectedHours,
        }).from(profiles).where(eq(profiles.id, claims.sub)))[0];
        if (!profile) throw new HttpError(404, 'no profile');
        const plans: (PlanRow & { title: string })[] = (await db.select({
          id: events.id, title: events.title, category: events.category, cost: events.cost,
          protected: events.protected, declined: sql<boolean>`${events.declined}`,
          with_people: events.withPeople,
          starts_at: sql<Date>`lower(${events.time})`, ends_at: sql<Date>`upper(${events.time})`,
        }).from(events)
          .where(and(
            eq(events.userId, claims.sub),
            eq(events.declined, false),
            sql`${events.time} && ${range(from.toISOString(), to.toISOString(), claims.sub)}`,
          ))
          .orderBy(asc(sql`lower(${events.time})`)))
          .map((r) => ({ ...r, starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString() }));
        const recent = await db.select({ kind: memories.kind, person: memories.person, felt: memories.felt })
          .from(memories).where(eq(memories.userId, claims.sub)).orderBy(desc(memories.createdAt)).limit(50);
        const tz = profile.timezone;

        let answer;
        try {
          answer = await askGemini({
            now: localIso(from, tz),
            timezone: tz,
            profile: { recharge_style: profile.rechargeStyle, busy_streak: profile.busyStreak, protected_hours: profile.protectedHours },
            memories: recent,
            plans: plans.map((p) => ({
              id: p.id, title: p.title, category: p.category, cost: p.category ? p.cost : null,
              starts_at: localIso(new Date(p.starts_at), tz), ends_at: localIso(new Date(p.ends_at), tz),
              with: p.with_people, protected: p.protected,
            })),
          });
        } catch (e) {
          if (e instanceof PlannerError) throw new HttpError(422, e.message);
          throw e;
        }

        // Classifications describe plans without changing them, so they are saved straight away.
        for (const k of answer.classify) {
          const p = plans.find((x) => x.id === k.event_id);
          if (!p || p.category) continue;
          p.category = k.category;
          p.cost = Math.max(-1, Math.min(DAY_ROOM, k.cost));
          await db.update(events).set({ category: p.category, cost: p.cost }).where(eq(events.id, p.id));
        }

        const changes = allowedChanges(answer.changes, plans);
        const scored = scoreDays(plans, changes, tz);
        return (await db.insert(calendarFixes).values({
          userId: claims.sub,
          summary: answer.summary,
          changes,
          days: scored,
          scoreBefore: Math.max(0, ...scored.map((d) => d.before)),
          scoreAfter: Math.max(0, ...scored.map((d) => d.after)),
        }).returning(fixColumns))[0];
      });
    }),

    // { fixId, only?: number[] }: applies the picked changes and marks the fix applied.
    route('POST', '/apply-fix', ({ pool, claims, body }) =>
      withService(pool, async (db) => {
        const fix = (await db.select().from(calendarFixes).where(and(
          eq(calendarFixes.id, body.fixId),
          eq(calendarFixes.userId, claims.sub),
          eq(calendarFixes.status, 'proposed'),
        )))[0];
        if (!fix) throw new HttpError(404, 'no proposed fix with that id');
        const writeBack = (await db.select({ writeBack: profiles.writeBack }).from(profiles)
          .where(eq(profiles.id, claims.sub)))[0]?.writeBack ?? false;
        const only: number[] | undefined = Array.isArray(body.only) ? body.only : undefined;
        const results = [];
        for (const [i, change] of (fix.changes as Change[]).entries()) {
          if (only && !only.includes(i)) continue;
          // A failed change rolls back alone; the others still apply.
          await db.execute(sql`savepoint change`);
          try {
            results.push({ i, op: change.op, ...(await applyChange(db, claims.sub, change, writeBack)) });
            await db.execute(sql`release savepoint change`);
          } catch (e) {
            await db.execute(sql`rollback to savepoint change`);
            results.push({ i, op: change.op, error: e instanceof Error ? e.message : String(e) });
          }
        }
        await db.update(calendarFixes).set({ status: 'applied', appliedAt: new Date() })
          .where(eq(calendarFixes.id, fix.id));
        return { results };
      })),
];

async function applyChange(db: Db, userId: string, ch: Change, writeBack: boolean) {
  if (ch.op === 'add_rest') {
    const [rest] = await db.insert(events).values({
      userId, title: ch.title!, time: range(ch.starts_at, ch.ends_at, userId) as unknown as string,
      category: 'rest', cost: -1, protected: true,
    }).returning({ id: events.id });
    if (!writeBack) return { local: 'added' };
    // Put it on the first Google calendar that allows write-back, so other apps see the time is taken.
    const conn = (await db.select({ id: calendarConnections.id }).from(calendarConnections)
      .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.writeBack, true))).limit(1))[0];
    if (!conn) return { local: 'added' };
    const g = await insertEvent(await googleAccessFor(db, userId), {
      summary: ch.title!, start: { dateTime: ch.starts_at! }, end: { dateTime: ch.ends_at! }, transparency: 'opaque',
    });
    await db.update(events).set({ connectionId: conn.id, externalId: g.id, source: 'google' })
      .where(eq(events.id, rest.id));
    return { local: 'added', remote: 'google' };
  }

  const e = (await db.select({
    id: events.id, protected: events.protected, externalId: events.externalId,
    connWriteBack: calendarConnections.writeBack,
  }).from(events)
    .leftJoin(calendarConnections, eq(calendarConnections.id, events.connectionId))
    .where(and(eq(events.id, ch.event_id!), eq(events.userId, userId))))[0];
  if (!e) throw new Error('plan no longer exists');
  if (e.protected) throw new Error('plan is protected');

  const set =
    ch.op === 'move' ? { time: range(ch.starts_at, ch.ends_at, userId), status: 'moved' }
    : ch.op === 'shorten' ? { time: sql`tstzrange(lower(${events.time}), ${ch.ends_at}::timestamptz)` }
    : ch.op === 'decline' ? { status: 'declined' }
    : { protected: true };
  await db.update(events).set(set as Record<string, unknown>).where(eq(events.id, e.id));

  const push = writeBack && e.connWriteBack && e.externalId && ch.op !== 'protect';
  if (!push) return { local: 'updated' };
  const access = await googleAccessFor(db, userId);
  if (ch.op === 'move') await patchEvent(access, e.externalId!, { start: { dateTime: ch.starts_at! }, end: { dateTime: ch.ends_at! } });
  if (ch.op === 'shorten') await patchEvent(access, e.externalId!, { end: { dateTime: ch.ends_at! } });
  if (ch.op === 'decline') {
    // Someone else's invite gets the reply "declined"; the user's own solo event is removed.
    const g = await getEvent(access, e.externalId!);
    if (g.attendees?.some((a) => a.self)) {
      await patchEvent(access, e.externalId!, {
        attendees: g.attendees.map((a) => (a.self ? { ...a, responseStatus: 'declined' } : a)),
      });
    } else await deleteEvent(access, e.externalId!);
  }
  return { local: 'updated', remote: 'google' };
}

async function googleAccessFor(db: Db, userId: string) {
  const account = await googleAccount(db, userId);
  if (!account) throw new Error('no Google Calendar access');
  return accessToken(account.refresh_token);
}
