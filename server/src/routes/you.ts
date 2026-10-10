import { ACHIEVEMENTS, MERRIER_PEOPLE } from '@fobo/core/achievements';
import { EVENING, STREAK_DAYS } from '@fobo/core/constants';
import {
  CAPACITY_LABELS, RECHARGE_VALUES, RECOVERY_VALUES, SOCIAL_ENERGY_VALUES, STREAK, TITLES, WIDGET, aloneTime, busyDays,
} from '@fobo/core/copy';
import { eq, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { route } from '../http.ts';
import { achievements, profiles } from '../schema.ts';
import { DAY_ROOM, clock } from '../time.ts';

// The You tab, in the shape of src/data/profile.ts: { profile, achievements, widget, capacity }.
// The catalog and wording come from @fobo/core, shared with the app.

const sentence = (items: string[]) =>
  items.length ? items.map((s, i) => (i ? s.toLowerCase() : s[0].toUpperCase() + s.slice(1))).join(', ') : null;

// Days in a row, ending today and counted from the day the user joined, whose load stayed within the day's room.
async function streak(db: Db, userId: string, today: string, joined: string) {
  const { rows } = await db.execute<{ load: number }>(sql`
    select load from day_scores(${userId}, greatest(${today}::date - ${STREAK_DAYS - 1}::int, ${joined}::date), ${today}::date) order by day desc`);
  let days = 0;
  for (const r of rows) {
    if (r.load > DAY_ROOM) break;
    days++;
  }
  return { days, of: STREAK_DAYS, title: STREAK.title(days), detail: STREAK.detail };
}

// "Today" widget: how the day looks, the next plan today, and a nudge when the evening is free.
async function widget(db: Db, userId: string, today: string) {
  const { rows } = await db.execute<{ load: number; next_title: string | null; next_start: string | null; evening: number }>(sql`
    with me as (select timezone as tz from profiles where id = ${userId})
    select (select load from day_scores(${userId}, ${today}::date, ${today}::date)) as load,
           n.title as next_title,
           to_char(lower(n.time) at time zone me.tz, 'YYYY-MM-DD"T"HH24:MI') as next_start,
           (select count(*)::int from events e where e.status not in ('declined', 'proposed')
              and e.time && tstzrange((${today}::date + ${EVENING}::time) at time zone me.tz,
                                      (${today}::date + 1)::timestamp at time zone me.tz)) as evening
    from me
    left join lateral (
      select title, time from events
      where status not in ('declined', 'proposed') and lower(time) > now()
        and lower(time) < (${today}::date + 1)::timestamp at time zone me.tz
      order by lower(time) limit 1
    ) n on true`);
  const r = rows[0];
  const load = r?.load ?? 0;
  return {
    label: WIDGET.label,
    headline: load <= DAY_ROOM / 2 ? WIDGET.roomy : load <= DAY_ROOM ? WIDGET.full : WIDGET.over,
    next: r?.next_title && r.next_start ? `${clock(r.next_start)} ${r.next_title}` : WIDGET.nothingNext,
    nudge: r && r.evening === 0 ? WIDGET.freeTonight : null,
  };
}

export const youRoutes = [
  route('GET', '/profile', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      const me = (await db.select().from(profiles).where(eq(profiles.id, claims.sub)))[0];
      if (!me) return null;
      const { rows } = await db.execute<{ email: string | null; today: string; joined: string }>(sql`
        select app.my_email() as email, to_char(now() at time zone ${me.timezone}, 'YYYY-MM-DD') as today,
               to_char(${me.createdAt}::timestamptz at time zone ${me.timezone}, 'YYYY-MM-DD') as joined`);
      const { email, today, joined } = rows[0];

      // Earned from what the user has done: a planned exit that came and went (The Irish Goodbye), a full
      // week within room (Slow and Steady), a plan with three or more people (More the Merrier), and a
      // week since joining (The First Week). Once earned, they stay.
      const done = (await db.execute<{ exit: boolean; merrier: boolean }>(sql`
        select exists(select 1 from events where leave_by is not null and status not in ('declined', 'proposed') and upper(time) <= now()) as exit,
               exists(select 1 from events where cardinality(with_people) >= ${MERRIER_PEOPLE}::int and status not in ('declined', 'proposed')) as merrier`)).rows[0];
      const strk = await streak(db, claims.sub, today, joined);
      const reached = [
        done.exit && 'irish-goodbye',
        strk.days >= strk.of && 'slow-steady',
        done.merrier && 'merrier',
        Date.now() - new Date(me.createdAt).getTime() >= STREAK_DAYS * 864e5 && 'first-week',
      ].filter((a): a is string => Boolean(a));
      if (reached.length) {
        await db.insert(achievements).values(reached.map((achievementId) => ({ userId: claims.sub, achievementId })))
          .onConflictDoNothing();
      }
      const earned = new Set((await db.select().from(achievements).where(eq(achievements.userId, claims.sub)))
        .map((a) => a.achievementId));

      const answers = (me.onboarding ?? {}) as Record<string, string>;
      const hours = typeof me.protectedHours === 'number' ? me.protectedHours : null;
      const capacity = [
        { label: CAPACITY_LABELS.recharge, value: RECHARGE_VALUES[answers.recharge], step: 'recharge' },
        { label: CAPACITY_LABELS.socialEnergy, value: SOCIAL_ENERGY_VALUES[answers['head-home']], step: 'head-home' },
        { label: CAPACITY_LABELS.alone, value: hours ? aloneTime(hours) : undefined },
        { label: CAPACITY_LABELS.busy, value: me.busyStreak ? busyDays(me.busyStreak) : undefined },
        { label: CAPACITY_LABELS.recovery, value: RECOVERY_VALUES[answers.yourself], step: 'yourself' },
        { label: CAPACITY_LABELS.stressRelief, value: sentence(me.stressRelief) ?? undefined },
      ].filter((row) => row.value).map(({ step, ...row }) => (step ? { ...row, step } : row));

      return {
        profile: {
          name: me.name ?? me.handle,
          title: TITLES[answers.recharge] ?? null,
          email,
          streak: strk,
        },
        achievements: ACHIEVEMENTS.filter((a) => earned.has(a.id)),
        widget: await widget(db, claims.sub, today),
        capacity,
      };
    })),
];
