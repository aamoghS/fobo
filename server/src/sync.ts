import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './db.ts';
import { accessToken, listChanges } from './google.ts';
import { calendarConnections, events } from './schema.ts';

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

// Pulls Google changes into events, as app_service. Only time, title and people come from Google;
// category, cost and visibility stay Fobo's. All-day events are skipped.
export async function syncConnection(db: Db, connectionId: string) {
  const conn = (await db.select().from(calendarConnections).where(eq(calendarConnections.id, connectionId)))[0];
  if (!conn) throw new Error('connection not found');
  const account = await googleAccount(db, conn.userId);
  if (!account) throw new Error('no Google Calendar access for this user');
  const access = await accessToken(account.refresh_token);

  const changes = (await listChanges(access, conn.syncToken)) ?? (await listChanges(access, null));
  if (!changes) throw new Error('google refused a full sync');

  let upserted = 0;
  let removed = 0;
  for (const g of changes.items) {
    if (g.status === 'cancelled') {
      removed += (await db.delete(events)
        .where(and(eq(events.connectionId, conn.id), eq(events.externalId, g.id)))
        .returning({ id: events.id })).length;
      continue;
    }
    if (!g.start?.dateTime || !g.end?.dateTime) continue;
    const people = (g.attendees ?? []).filter((a) => !a.self).map((a) => a.displayName ?? a.email);
    const declined = (g.attendees ?? []).some((a) => a.self && a.responseStatus === 'declined');
    const fromGoogle = {
      title: g.summary ?? '(no title)',
      time: sql`tstzrange(${g.start.dateTime}::timestamptz, ${g.end.dateTime}::timestamptz)` as unknown as string,
      withPeople: people,
      status: declined ? 'declined' : 'accepted',
    };
    await db.insert(events)
      .values({ userId: conn.userId, connectionId: conn.id, externalId: g.id, source: 'google', ...fromGoogle })
      .onConflictDoUpdate({ target: [events.connectionId, events.externalId], set: fromGoogle });
    upserted++;
  }
  await db.update(calendarConnections)
    .set({ syncToken: changes.nextSyncToken, lastSyncedAt: new Date() })
    .where(eq(calendarConnections.id, conn.id));
  return { upserted, removed };
}
