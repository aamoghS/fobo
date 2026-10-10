import { eq, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { route } from '../http.ts';
import { achievements, profiles } from '../schema.ts';
import { DAY_ROOM, clock } from '../time.ts';

// The You tab, in the shape of src/data/profile.ts: { profile, achievements, widget, capacity }.
// Copy matches the app's mock where it exists; the rest is marked in server/README.md for design.

// The achievement catalog, as the app draws it (src/data/profile.ts achievements).
const CATALOG = [
  { id: 'irish-goodbye', title: 'The Irish Goodbye', icon: 'home', badge: 'red' },
  { id: 'slow-steady', title: 'Slow and Steady', icon: 'snail', badge: 'pink' },
  { id: 'merrier', title: 'More the Merrier', icon: 'paper-airplane', badge: 'green' },
  { id: 'first-week', title: 'The First Week', icon: 'calendar', badge: 'blue' },
] as const;

// Onboarding answers (src/screens/onboarding/Onboarding.tsx) as Capacity Profile values.
const RECHARGE: Record<string, string> = {
  alone: 'Recharges alone', people: 'Recharges with people', depends: 'Recharges both ways',
};
const SOCIAL_ENERGY: Record<string, string> = {
  'In the first hour': 'Fades after ~1 hr',
  'After 1 to 2 hours': 'Fades after ~2 hrs',
  'After 2 to 3 hours': 'Fades after ~3 hrs',
  'I stayed happily to the end': 'Lasts all night',
};
const RECOVERY: Record<string, string> = {
  'Same evening': 'Recovers the same evening',
  'Next morning': '1 night recovery needed',
  'After a day': '1 day recovery needed',
  '2 to 3 days': '3 days recovery needed',
  Longer: 'More than 3 days recovery needed',
};
const TITLES: Record<string, string> = { people: 'Social Butterfly', depends: 'Social Butterfly', alone: 'Homebody' };

const sentence = (items: string[]) =>
  items.length ? items.map((s, i) => (i ? s.toLowerCase() : s[0].toUpperCase() + s.slice(1))).join(', ') : null;

// Days in a row, ending today, whose load stayed within the day's room.
async function streak(db: Db, userId: string, today: string) {
  const { rows } = await db.execute<{ load: number }>(sql`
    select load from day_scores(${userId}, ${today}::date - 6, ${today}::date) order by day desc`);
  let days = 0;
  for (const r of rows) {
    if (r.load > DAY_ROOM) break;
    days++;
  }
  return { days, of: 7, title: `${days} day streak!`, detail: 'Maintained balanced energy!' };
}

// "Today" widget: how the day looks, the next plan today, and a nudge when the evening is free.
async function widget(db: Db, userId: string, today: string) {
  const { rows } = await db.execute<{ load: number; next_title: string | null; next_start: string | null; evening: number }>(sql`
    with me as (select timezone as tz from profiles where id = ${userId})
    select (select load from day_scores(${userId}, ${today}::date, ${today}::date)) as load,
           n.title as next_title,
           to_char(lower(n.time) at time zone me.tz, 'YYYY-MM-DD"T"HH24:MI') as next_start,
           (select count(*)::int from events e where not e.declined
              and e.time && tstzrange((${today}::date + time '18:00') at time zone me.tz,
                                      (${today}::date + 1)::timestamp at time zone me.tz)) as evening
    from me
    left join lateral (
      select title, time from events
      where not declined and lower(time) > now()
        and lower(time) < (${today}::date + 1)::timestamp at time zone me.tz
      order by lower(time) limit 1
    ) n on true`);
  const r = rows[0];
  const load = r?.load ?? 0;
  return {
    label: 'Today',
    headline: load <= DAY_ROOM / 2 ? 'Still fuel left in your tank.' : load <= DAY_ROOM ? 'A full day.' : 'Over the line today.',
    next: r?.next_title && r.next_start ? `${clock(r.next_start)} ${r.next_title}` : 'Nothing else today',
    nudge: r && r.evening === 0 ? 'Free tonight. Rest?' : null,
  };
}

export const youRoutes = [
  route('GET', '/profile', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      const me = (await db.select().from(profiles).where(eq(profiles.id, claims.sub)))[0];
      if (!me) return null;
      const { rows } = await db.execute<{ email: string | null; today: string }>(sql`
        select app.my_email() as email, to_char(now() at time zone ${me.timezone}, 'YYYY-MM-DD') as today`);
      const { email, today } = rows[0];

      // The First Week is earned a week after joining.
      if (Date.now() - new Date(me.createdAt).getTime() >= 7 * 864e5) {
        await db.insert(achievements).values({ userId: claims.sub, achievementId: 'first-week' }).onConflictDoNothing();
      }
      const earned = new Set((await db.select().from(achievements).where(eq(achievements.userId, claims.sub)))
        .map((a) => a.achievementId));

      const answers = (me.onboarding ?? {}) as Record<string, string>;
      const hours = typeof me.protectedHours === 'number' ? me.protectedHours : null;
      const capacity = [
        { label: 'How you recharge', value: RECHARGE[answers.recharge], step: 'recharge' },
        { label: 'Social energy', value: SOCIAL_ENERGY[answers['head-home']], step: 'head-home' },
        { label: 'Alone time', value: hours ? `${hours} hours needed` : undefined },
        { label: 'Busy days', value: me.busyStreak ? `${me.busyStreak} busy days in a row is fine` : undefined },
        { label: 'Recovery', value: RECOVERY[answers.yourself], step: 'yourself' },
        { label: 'Stress-relief', value: sentence(me.stressRelief) ?? undefined },
      ].filter((row) => row.value).map(({ step, ...row }) => (step ? { ...row, step } : row));

      return {
        profile: {
          name: me.name ?? me.handle,
          title: TITLES[answers.recharge] ?? null,
          email,
          streak: await streak(db, claims.sub, today),
        },
        achievements: CATALOG.filter((a) => earned.has(a.id)),
        widget: await widget(db, claims.sub, today),
        capacity,
      };
    })),
];
