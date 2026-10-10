import { eq } from 'drizzle-orm';
import { withService, withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { calendarConnections } from '../schema.ts';
import { googleAccount, syncConnection } from '../sync.ts';

const connection = {
  id: calendarConnections.id,
  accountEmail: calendarConnections.accountEmail,
  writeBack: calendarConnections.writeBack,
  lastSyncedAt: calendarConnections.lastSyncedAt,
};

export async function connect(db: Db, userId: string) {
  const account = await googleAccount(db, userId);
  if (!account) throw new HttpError(409, 'Sign in with Google and allow Calendar access first');
  const [conn] = await db.insert(calendarConnections)
    .values({ userId, accountEmail: account.email })
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.accountEmail],
      set: { syncToken: null },
    })
    .returning({ id: calendarConnections.id });
  return { connectionId: conn.id, account: account.email, ...(await syncConnection(db, conn.id)) };
}

export const googleRoutes = [
  // Re-pulls every Google account the caller has connected.
  route('POST', '/google-sync', ({ pool, claims }) =>
    withService(pool, async (db) => {
      const conns = await db.select({ id: calendarConnections.id }).from(calendarConnections)
        .where(eq(calendarConnections.userId, claims.sub));
      const results = [];
      for (const { id } of conns) results.push({ connectionId: id, ...(await syncConnection(db, id)) });
      return { results };
    })),

  // Connected Apps & Devices in Settings.
  route('GET', '/connections', ({ pool, claims }) =>
    withUser(pool, claims, (db) => db.select(connection).from(calendarConnections))),

  route('PATCH', '/connections/:id', ({ pool, claims, params, body }) =>
    withUser(pool, claims, async (db) => {
      await db.update(calendarConnections).set({ writeBack: !!body.writeBack })
        .where(eq(calendarConnections.id, params.id));
    })),

  route('DELETE', '/connections/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      await db.delete(calendarConnections).where(eq(calendarConnections.id, params.id));
    })),
];
