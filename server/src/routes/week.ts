import { sql } from 'drizzle-orm';
import { withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { when } from '../time.ts';

// Your week (src/data/week.ts): the week's dates, "Time for you" (hours of enjoy and rest plans),
// "Up next" (the next plan from now), and each day's load and whether it is over.
// Days are in the user's timezone.
export const weekRoutes = [
  route('GET', '/week', ({ pool, claims, query }) => {
    const start = query.get('start');
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new HttpError(400, 'start is required (YYYY-MM-DD)');
    return withUser(pool, claims, async (db) => {
      const { rows } = await db.execute<{
        end: string; personal_hours: number; next_title: string | null; next_start: string | null; today: string;
      }>(sql`
        with me as (select timezone as tz from profiles where id = ${claims.sub}),
        span as (
          select (${start}::date::timestamp at time zone me.tz) as lo,
                 ((${start}::date + 7)::timestamp at time zone me.tz) as hi, me.tz
          from me)
        select to_char(${start}::date + 6, 'YYYY-MM-DD') as end,
               to_char(now() at time zone span.tz, 'YYYY-MM-DD') as today,
               coalesce((select round(sum(extract(epoch from upper(e.time) - lower(e.time))) / 3600, 1)
                         from events e where not e.declined and e.category in ('enjoy', 'rest')
                           and e.time && tstzrange(span.lo, span.hi)), 0) as personal_hours,
               n.title as next_title,
               to_char(lower(n.time) at time zone span.tz, 'YYYY-MM-DD"T"HH24:MI') as next_start
        from span
        left join lateral (
          select title, time from events
          where not declined and lower(time) > now() order by lower(time) limit 1
        ) n on true`);
      const days = await db.execute<{ day: string; load: number; room: number; over: boolean }>(sql`
        select to_char(day, 'YYYY-MM-DD') as day, load, room, load > room as over
        from day_scores(${claims.sub}, ${start}::date, ${start}::date + 6)`);
      const r = rows[0];
      if (!r) throw new HttpError(404, 'no profile');
      return {
        start,
        end: r.end,
        personalHours: r.personal_hours,
        // The app shows `when` ('Tomorrow 11:30'); `start` is the plan's local time.
        upNext: r.next_title && r.next_start
          ? { title: r.next_title, when: when(r.next_start, r.today), start: r.next_start }
          : null,
        // over: the day is past its room (the app's isOverflowing).
        days: days.rows.map((d) => ({ date: d.day, load: d.load, room: d.room, over: d.over })),
      };
    });
  }),
];
