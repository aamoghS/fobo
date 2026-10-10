import { MAX_FRIEND_DAYS } from '@fobo/core/constants';
import { NO_UPCOMING } from '@fobo/core/copy';
import { DEFAULT_TINT } from '@fobo/core/options';
import { and, eq, or, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { friendships, profilePublic } from '../schema.ts';
import { weekday } from '../time.ts';

const cleanHandle = (h: unknown) => String(h ?? '').trim().toLowerCase().replace(/^@/, '');

const person = {
  id: profilePublic.id, handle: profilePublic.handle, name: profilePublic.name, character: profilePublic.character,
  bio: profilePublic.bio, tint: profilePublic.tint,
};

type Together = { nextPlan: { title: string; start: string } | null; pastTogether: number };

// What People shows for each person (src/data/people.ts): the caller's next plan with them, and how many
// past plans they shared. Plans name people by id in `with`. One query for everyone.
async function togetherAll(db: Db, me: string, ids: string[]): Promise<Map<string, Together>> {
  if (!ids.length) return new Map();
  const { rows } = await db.execute<{ id: string; title: string | null; start: string | null; past: number }>(sql`
    select o.id, n.title, to_char(lower(n.time) at time zone p.timezone, 'YYYY-MM-DD"T"HH24:MI') as start,
           (select count(*)::int from events e where e.user_id = ${me} and o.id = any(e.with_people)
              and not e.declined and upper(e.time) <= now()) as past
    from unnest(array[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::text[]) as o(id)
    join profiles p on p.id = ${me}
    left join lateral (
      select title, time from events e where e.user_id = ${me} and o.id = any(e.with_people)
        and not e.declined and lower(e.time) > now() order by lower(e.time) limit 1
    ) n on true`);
  return new Map(rows.map((r) => [r.id, {
    nextPlan: r.title && r.start ? { title: r.title, start: r.start } : null,
    pastTogether: r.past,
  }]));
}

const together = async (db: Db, me: string, otherId: string): Promise<Together> =>
  (await togetherAll(db, me, [otherId])).get(otherId) ?? { nextPlan: null, pastTogether: 0 };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function checkDates(...dates: (string | null)[]) {
  if (dates.some((d) => d !== null && (!DATE.test(d) || Number.isNaN(Date.parse(d))))) {
    throw new HttpError(400, 'dates are YYYY-MM-DD');
  }
}

// Friends never read events: blocks and scores come from these two database functions, which
// check the friendship and the owner's sharing switches.
async function friendBlocks(db: Db, friendId: string, date: string | null) {
  const { rows } = await db.execute<{ start: string; end: string; title: string | null; category: string | null }>(
    sql`select start_local as start, end_local as end, title, category from friend_blocks(${friendId}, ${date}::date)`,
  );
  return rows;
}

async function dayScores(db: Db, ownerId: string, from: string | null, to: string | null) {
  const { rows } = await db.execute<{ day: string; load: number; room: number; over: boolean }>(
    sql`select to_char(day, 'YYYY-MM-DD') as day, load, room, load > room as over
        from day_scores(${ownerId}, ${from}::date, ${to}::date)`,
  );
  return rows;
}

const between = (me: string, other: string) => or(
  and(eq(friendships.requesterId, me), eq(friendships.addresseeId, other)),
  and(eq(friendships.requesterId, other), eq(friendships.addresseeId, me)),
);

// Your circle on People, in the app's Person shape (src/data/people.ts): name, avatar tint, the next
// plan together as 'Dinner · Saturday', bio, and how many plans you have shared.
async function circle(db: Db, me: string) {
  const rows = await db.select(person).from(friendships)
    .innerJoin(profilePublic, eq(profilePublic.id, sql`case when ${friendships.requesterId} = ${me}
      then ${friendships.addresseeId} else ${friendships.requesterId} end`))
    .where(eq(friendships.status, 'accepted'));
  const all = await togetherAll(db, me, rows.map((p) => p.id));
  return rows.map((p) => {
    const t = all.get(p.id);
    return {
      id: p.id,
      name: p.name ?? p.handle,
      tint: p.tint ?? DEFAULT_TINT,
      ...(p.character ? { character: p.character } : {}),
      nextLabel: t?.nextPlan ? `${t.nextPlan.title} · ${weekday(t.nextPlan.start)}` : NO_UPCOMING,
      ...(p.bio ? { bio: p.bio } : {}),
      ...(t?.pastTogether ? { pastTogether: t.pastTogether } : {}),
    };
  });
}

export const friendRoutes = [
  route('GET', '/people', ({ pool, claims }) => withUser(pool, claims, (db) => circle(db, claims.sub))),

  // Accepted friends, requests to me, and requests I sent, with public profile fields.
  route('GET', '/friends', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      const rows = await db
        .select({ requesterId: friendships.requesterId, status: friendships.status, ...person })
        .from(friendships)
        .innerJoin(profilePublic, eq(profilePublic.id, sql`case when ${friendships.requesterId} = ${claims.sub}
          then ${friendships.addresseeId} else ${friendships.requesterId} end`));
      const list = (test: (r: (typeof rows)[number]) => boolean) =>
        rows.filter(test).map(({ requesterId: _, status: __, ...p }) => p);
      const accepted = list((r) => r.status === 'accepted');
      const all = await togetherAll(db, claims.sub, accepted.map((p) => p.id));
      const friends = accepted.map((p) => ({ ...p, ...(all.get(p.id) ?? { nextPlan: null, pastTogether: 0 }) }));
      return {
        friends,
        incoming: list((r) => r.status === 'pending' && r.requesterId !== claims.sub),
        outgoing: list((r) => r.status === 'pending' && r.requesterId === claims.sub),
      };
    })),

  route('GET', '/people/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      const row = (await db.select(person).from(profilePublic).where(eq(profilePublic.id, params.id)))[0];
      if (!row) throw new HttpError(404, 'not found');
      return { ...row, ...(await together(db, claims.sub, params.id)) };
    })),

  // Add by exact handle, or by the email they signed in with: creates a pending request.
  route('POST', '/friends', ({ pool, claims, body }) =>
    withUser(pool, claims, async (db) => {
      const other = body.email
        ? (await db.execute<{ id: string | null }>(sql`select app.profile_id_by_email(${String(body.email).trim()}) as id`)).rows[0]
        : (await db.select({ id: profilePublic.id }).from(profilePublic)
          .where(eq(profilePublic.handle, cleanHandle(body.handle))))[0];
      if (!other?.id || other.id === claims.sub) throw new HttpError(404, 'no one with that handle or email');
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
  route('GET', '/friends/:id/blocks', ({ pool, claims, params, query }) => {
    checkDates(query.get('date'));
    return withUser(pool, claims, (db) => friendBlocks(db, params.id, query.get('date')));
  }),

  // The app's FriendDay (src/features/friends/types.ts) for each day in from..to, at most MAX_FRIEND_DAYS.
  // Empty when the friend shares neither blocks nor scores.
  route('GET', '/friends/:id/days', ({ pool, claims, params, query }) =>
    withUser(pool, claims, async (db) => {
      const from = query.get('from');
      const to = query.get('to');
      checkDates(from, to);
      const last = from ? new Date(Date.parse(from) + (MAX_FRIEND_DAYS - 1) * 864e5).toISOString().slice(0, 10) : null;
      // One query: each day's score with that day's blocks, instead of one query per day.
      const { rows } = await db.execute<{ day: string; load: number; blocks: number; titles: string[] }>(sql`  
        select to_char(s.day, 'YYYY-MM-DD') as day, s.load, count(b.*)::int as blocks,
               coalesce(array_agg(b.title) filter (where b.title is not null), '{}') as titles
        from day_scores(${params.id}, ${from}::date, ${to && last && to > last ? last : to}::date) s
        left join lateral friend_blocks(${params.id}, s.day) b on true
        group by s.day, s.load
        order by s.day`);
      return rows.map((r) => ({
        date: r.day,
        busy: r.blocks > 0,
        load: r.load,
        ...(r.titles.length ? { sharedPlanTitles: r.titles } : {}),
      }));
    })),

  // Works for an accepted friend who shares scores, or for the caller's own id.
  route('GET', '/scores/:id', ({ pool, claims, params, query }) => {
    checkDates(query.get('from'), query.get('to'));
    return withUser(pool, claims, (db) => dayScores(db, params.id, query.get('from'), query.get('to')));
  }),
];
