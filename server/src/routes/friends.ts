import { and, eq, or, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { friendships, profilePublic } from '../schema.ts';

const cleanHandle = (h: unknown) => String(h ?? '').trim().toLowerCase().replace(/^@/, '');

const person = {
  id: profilePublic.id, handle: profilePublic.handle, name: profilePublic.name, character: profilePublic.character,
};

// Friends never read events: blocks and scores come from these two database functions, which
// check the friendship and the owner's sharing switches.
async function friendBlocks(db: Db, friendId: string, date: string | null) {
  const { rows } = await db.execute<{ start: Date; end: Date; title: string | null; category: string | null }>(
    sql`select lower(span) as start, upper(span) as end, title, category from friend_blocks(${friendId}, ${date}::date)`,
  );
  return rows;
}

async function dayScores(db: Db, ownerId: string, from: string | null, to: string | null) {
  const { rows } = await db.execute<{ day: string; load: number; room: number }>(
    sql`select to_char(day, 'YYYY-MM-DD') as day, load, room from day_scores(${ownerId}, ${from}::date, ${to}::date)`,
  );
  return rows;
}

const between = (me: string, other: string) => or(
  and(eq(friendships.requesterId, me), eq(friendships.addresseeId, other)),
  and(eq(friendships.requesterId, other), eq(friendships.addresseeId, me)),
);

export const friendRoutes = [
  // Accepted friends, requests to me, and requests I sent, with public profile fields.
  route('GET', '/friends', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      const rows = await db
        .select({ requesterId: friendships.requesterId, status: friendships.status, ...person })
        .from(friendships)
        .innerJoin(profilePublic, eq(profilePublic.id, sql`case when ${friendships.requesterId} = ${claims.sub}
          then ${friendships.addresseeId} else ${friendships.requesterId} end`));
      const list = (test: (r: (typeof rows)[number]) => boolean) =>
        rows.filter(test).map(({ id, handle, name, character }) => ({ id, handle, name, character }));
      return {
        friends: list((r) => r.status === 'accepted'),
        incoming: list((r) => r.status === 'pending' && r.requesterId !== claims.sub),
        outgoing: list((r) => r.status === 'pending' && r.requesterId === claims.sub),
      };
    })),

  route('GET', '/people/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      const row = (await db.select(person).from(profilePublic).where(eq(profilePublic.id, params.id)))[0];
      if (!row) throw new HttpError(404, 'not found');
      return row;
    })),

  // Add by exact handle: creates a pending request.
  route('POST', '/friends', ({ pool, claims, body }) =>
    withUser(pool, claims, async (db) => {
      const other = (await db.select({ id: profilePublic.id }).from(profilePublic)
        .where(eq(profilePublic.handle, cleanHandle(body.handle))))[0];
      if (!other || other.id === claims.sub) throw new HttpError(404, 'no one with that handle');
      const added = await db.insert(friendships).values({ requesterId: claims.sub, addresseeId: other.id })
        .onConflictDoNothing().returning();
      if (!added.length) throw new HttpError(409, 'already friends or asked');
      return { id: other.id };
    })),

  route('POST', '/friends/:id/accept', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      const done = await db.update(friendships).set({ status: 'accepted' })
        .where(and(
          eq(friendships.requesterId, params.id),
          eq(friendships.addresseeId, claims.sub),
          eq(friendships.status, 'pending'),
        ))
        .returning();
      if (!done.length) throw new HttpError(404, 'no request from them');
    })),

  // Unfriend, cancel, or turn down: the row goes either way.
  route('DELETE', '/friends/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      await db.delete(friendships).where(between(claims.sub, params.id));
    })),

  // ?date=YYYY-MM-DD in the friend's timezone.
  route('GET', '/friends/:id/blocks', ({ pool, claims, params, query }) =>
    withUser(pool, claims, (db) => friendBlocks(db, params.id, query.get('date')))),

  // The app's FriendDay (src/features/friends/types.ts) for each day in from..to, at most 14 days.
  // Empty when the friend shares neither blocks nor scores.
  route('GET', '/friends/:id/days', ({ pool, claims, params, query }) =>
    withUser(pool, claims, async (db) => {
      const from = query.get('from');
      const last = from ? new Date(Date.parse(from) + 13 * 864e5).toISOString().slice(0, 10) : null;
      const to = query.get('to');
      const scores = await dayScores(db, params.id, from, to && last && to > last ? last : to);
      const days = [];
      for (const s of scores) {
        const blocks = await friendBlocks(db, params.id, s.day);
        const titles = blocks.map((b) => b.title).filter((t): t is string => !!t);
        days.push({
          date: s.day,
          busy: blocks.length > 0,
          load: s.load,
          ...(titles.length ? { sharedPlanTitles: titles } : {}),
        });
      }
      return days;
    })),

  // Works for an accepted friend who shares scores, or for the caller's own id.
  route('GET', '/scores/:id', ({ pool, claims, params, query }) =>
    withUser(pool, claims, (db) => dayScores(db, params.id, query.get('from'), query.get('to')))),
];
