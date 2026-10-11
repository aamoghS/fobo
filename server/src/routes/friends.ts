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
// past plans they shared. Fobo plans name people by id in `with`; Google events by address (sync.ts), so a
// friend's sign-in address (friend_addresses, migration 025) matches too. One query for everyone.
async function togetherAll(db: Db, me: string, ids: string[]): Promise<Map<string, Together>> {
  if (!ids.length) return new Map();
  const list = sql`array[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::text[]`;
  const withThem = sql`exists (select 1 from unnest(e.with_people) w where w = o.id or lower(w) = any(k.addresses))`;
  const { rows } = await db.execute<{ id: string; title: string | null; start: string | null; past: number }>(sql`
    select o.id, n.title, to_char(lower(n.time) at time zone p.timezone, 'YYYY-MM-DD"T"HH24:MI') as start,
           (select count(*)::int from events e where e.user_id = ${me} and ${withThem}
              and not e.declined and upper(e.time) <= now()) as past
    from unnest(${list}) as o(id)
    join profiles p on p.id = ${me}
    left join (select id, array_agg(address) as addresses from friend_addresses(${list}) group by id) k on k.id = o.id
    left join lateral (
      select title, time from events e where e.user_id = ${me} and ${withThem}
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

// Friends never read events: blocks and scores come from these database functions (and which of them
// a friend shares from friend_sharing), which check the friendship and the owner's sharing switches.
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

  // The app's FriendDay (src/features/friends/types.ts) for each day in from..to, at most MAX_FRIEND_DAYS:
  // the day's busy blocks when the friend shares them, its load when they share scores (null when not).
  // Empty when they share neither, or aren't an accepted friend.
  route('GET', '/friends/:id/days', ({ pool, claims, params, query }) =>
    withUser(pool, claims, async (db) => {
      const from = query.get('from');
      const to = query.get('to');
      checkDates(from, to);
      if (!from || !to) throw new HttpError(400, 'from and to are required');
      const last = new Date(Date.parse(from) + (MAX_FRIEND_DAYS - 1) * 864e5).toISOString().slice(0, 10);
      const until = to > last ? last : to;
      // One query. Days come from the calendar, not day_scores, which has none unless scores are shared;
      // friend_sharing has no row for a non-friend, so then there are no days at all.
      const { rows } = await db.execute<{
        day: string; load: number | null; blocks: { start: string; end: string }[] | null; titles: string[];
      }>(sql`
        select to_char(d.day, 'YYYY-MM-DD') as day, s.load,
               case when sh.blocks then coalesce(json_agg(json_build_object('start', b.start_local, 'end', b.end_local)
                 order by b.start_local) filter (where b.start_local is not null), '[]') end as blocks,
               coalesce(array_agg(b.title order by b.start_local) filter (where b.title is not null), '{}') as titles
        from friend_sharing(${params.id}) sh
        cross join (select g::date as day from generate_series(${from}::date, ${until}::date, interval '1 day') g) d
        left join day_scores(${params.id}, ${from}::date, ${until}::date) s on s.day = d.day
        left join lateral friend_blocks(${params.id}, d.day) b on true
        where sh.blocks or sh.scores
        group by d.day, s.load, sh.blocks
        order by d.day`);
      return rows.map((r) => ({
        date: r.day,
        // From their blocks when they share them, else from the day's load.
        busy: r.blocks ? r.blocks.length > 0 : (r.load ?? 0) > 0,
        load: r.load,
        ...(r.blocks ? { blocks: r.blocks } : {}),
        ...(r.titles.length ? { sharedPlanTitles: r.titles } : {}),
      }));
    })),

  // Works for an accepted friend who shares scores, or for the caller's own id.
  route('GET', '/scores/:id', ({ pool, claims, params, query }) => {
    checkDates(query.get('from'), query.get('to'));
    return withUser(pool, claims, (db) => dayScores(db, params.id, query.get('from'), query.get('to')));
  }),
];
