import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './db.ts';
import { accessToken, listCalendars, listChanges } from './google.ts';
import { calendarConnections, calendarSync, events, profiles } from './schema.ts';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// The user's Google account with Calendar access (saved at sign-in by src/routes/auth.ts), or null.
export async function googleAccount(db: Db, userId: string) {
  const { rows } = await db.execute<{ refresh_token: string; scope: string | null; email: string }>(sql`
    select pgp_sym_decrypt(refresh_token, ${process.env.AUTH_SECRET ?? ''}) as refresh_token, scope, email
    from google_accounts where user_id = ${userId} and refresh_token is not null`);
  const row = rows[0];
  if (!row || !String(row.scope ?? '').split(/[ ,]/).includes(CALENDAR_SCOPE)) return null;
  return row;
}

// Pulls Google changes from every calendar on the account into events, as app_service. Only time,
// title and people come from Google; category, cost and visibility stay Fobo's. All-day events cover
// their days in the person's timezone and cost nothing.
export async function syncConnection(db: Db, connectionId: string) {
  const conn = (await db.select().from(calendarConnections).where(eq(calendarConnections.id, connectionId)))[0];
  if (!conn) throw new Error('connection not found');
  const account = await googleAccount(db, conn.userId);
  if (!account) throw new Error('no Google Calendar access for this user');
  const access = await accessToken(account.refresh_token);
  const tz = (await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.id, conn.userId)))[0]?.tz ?? 'UTC';

  let upserted = 0;
  let removed = 0;
  // Every calendar is fetched from Google at the same time; the database writes then run in order.
  const tokens = new Map((await db.select().from(calendarSync).where(eq(calendarSync.connectionId, conn.id)))
    .map((r) => [r.calendarId, r.syncToken]));
  const fetched = await Promise.all((await listCalendars(access)).map(async (calendar) => ({
    calendar,
    changes: (await listChanges(access, calendar, tokens.get(calendar) ?? null))
      ?? (await listChanges(access, calendar, null)),
  })));
  for (const { calendar, changes } of fetched) {
    if (!changes) continue;

    for (const g of changes.items) {
      if (g.status === 'cancelled') {
        removed += (await db.delete(events)
          .where(and(eq(events.connectionId, conn.id), eq(events.externalId, g.id)))
          .returning({ id: events.id })).length;
        continue;
      }
      const allDay = !g.start?.dateTime && !!g.start?.date && !!g.end?.date;
      if (!allDay && (!g.start?.dateTime || !g.end?.dateTime)) continue;
      const time = allDay
        ? sql`tstzrange(${g.start!.date}::date::timestamp at time zone ${tz}, ${g.end!.date}::date::timestamp at time zone ${tz})`
        : sql`tstzrange(${g.start!.dateTime}::timestamptz, ${g.end!.dateTime}::timestamptz)`;
      const people = (g.attendees ?? []).filter((a) => !a.self).map((a) => a.displayName ?? a.email);
      const declined = (g.attendees ?? []).some((a) => a.self && a.responseStatus === 'declined');
      const fromGoogle = {
        title: g.summary ?? '(no title)',
        time: time as unknown as string,
        withPeople: people,
        status: declined ? 'declined' : 'accepted',
        calendarId: calendar,
      };
      // A starting cost from the length (half a point an hour, 0.5 to 5); the person or the planner refines it.
      const hours = allDay ? 0 : (Date.parse(g.end!.dateTime!) - Date.parse(g.start!.dateTime!)) / 36e5;
      const cost = allDay ? 0 : Math.min(5, Math.max(0.5, Math.round(hours) / 2));
      await db.insert(events)
        .values({ userId: conn.userId, connectionId: conn.id, externalId: g.id, source: 'google', cost, ...fromGoogle })
        .onConflictDoUpdate({ target: [events.connectionId, events.externalId], set: fromGoogle });
      upserted++;
    }
    await db.insert(calendarSync).values({ connectionId: conn.id, calendarId: calendar, syncToken: changes.nextSyncToken })
      .onConflictDoUpdate({ target: [calendarSync.connectionId, calendarSync.calendarId], set: { syncToken: changes.nextSyncToken } });
  }
  await db.update(calendarConnections).set({ lastSyncedAt: new Date() }).where(eq(calendarConnections.id, conn.id));
  return { upserted, removed };
}