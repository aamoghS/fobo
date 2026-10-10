import { WEIGH } from '@fobo/core/copy';
import { desc, eq, sql } from 'drizzle-orm';
import { withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { PlannerError, plannerReady } from '../planner.ts';
import { events, memories, profiles } from '../schema.ts';
import { DAY_ROOM, clock, weekday } from '../time.ts';
import { weighPlan } from '../weigh.ts';
import { planColumns, planDetail, range } from './events.ts';

// The day's load from every other plan the user is going to that day (in their timezone).
async function dayLoad(db: Db, userId: string, date: string, exceptId: string | null) {
  const { rows } = await db.execute<{ load: number }>(sql`
    select coalesce(sum(e.cost), 0) as load
    from events e join profiles p on p.id = e.user_id
    where p.id = ${userId} and e.status in ('accepted', 'moved')
      and (${exceptId}::uuid is null or e.id <> ${exceptId}::uuid)
      and lower(e.time) >= ${date}::date::timestamp at time zone p.timezone
      and lower(e.time) < (${date}::date + 1)::timestamp at time zone p.timezone`);
  return Math.max(0, Number(rows[0]?.load ?? 0));
}

export const weighRoutes = [
  // Weigh a plan. { planId }: a plan from the calendar (usually an invite not answered yet); { text }: a
  // plan or invite as written, saved as a tentative plan. Gemini weighs it from the profile, memories and
  // the next two weeks; the plan keeps the cost, why (with what it does to that day) and a leave-by time
  // when one helps. Answers the plan with `detail`, plus `day`: the load before and after, and `over`.
  route('POST', '/weigh', async ({ pool, claims, body }) => {
    if (!plannerReady()) throw new HttpError(503, "The planner isn't set up yet");
    const planId = typeof body.planId === 'string' ? body.planId : null;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!planId && !text) throw new HttpError(400, 'planId or text is required');
    if (text.length > 2000) throw new HttpError(400, 'text is too long');

    // Read what Gemini needs first, so no transaction stays open while it answers.
    const ctx = await withUser(pool, claims, async (db) => {
      const me = (await db.select().from(profiles).where(eq(profiles.id, claims.sub)))[0];
      if (!me) throw new HttpError(404, 'no profile');
      const plan = planId ? (await db.select(planColumns).from(events).where(eq(events.id, planId)))[0] : undefined;
      if (planId && !plan) throw new HttpError(404, 'not found');
      const now = (await db.execute<{ now: string }>(sql`
        select to_char(now() at time zone ${me.timezone}, 'YYYY-MM-DD"T"HH24:MI') as now`)).rows[0].now;
      const upcoming = await db.select({
        title: events.title, kind: planColumns.kind, cost: events.cost, starts_at: planColumns.start, ends_at: planColumns.end,
      }).from(events)
        .where(sql`${events.status} in ('accepted', 'moved') and ${events.time} && tstzrange(now(), now() + interval '14 days')`)
        .orderBy(sql`lower(${events.time})`)
        .limit(200);
      const recent = await db.select({ kind: memories.kind, person: memories.person, felt: memories.felt })
        .from(memories).orderBy(desc(memories.createdAt)).limit(50);
      return { me, plan, now, upcoming, recent };
    });

    const { me, plan } = ctx;
    const answers = (me.onboarding ?? {}) as Record<string, string>;
    let w;
    try {
      w = await weighPlan({
        now: ctx.now,
        profile: {
          recharge: answers.recharge ?? me.rechargeStyle,
          head_home: answers['head-home'] ?? null,
          recover: answers.yourself ?? null,
          busy_streak: me.busyStreak,
        },
        memories: ctx.recent,
        plans: ctx.upcoming,
        ...(plan
          ? { calendar_plan: { title: plan.title, kind: plan.kind, starts_at: plan.start, ends_at: plan.end, with: plan.with } }
          : { text }),
      });
    } catch (e) {
      if (e instanceof PlannerError) throw new HttpError(422, e.message);
      throw e;
    }

    return withUser(pool, claims, async (db) => {
      const date = (plan?.start ?? w.starts_at).slice(0, 10);
      const before = await dayLoad(db, claims.sub, date, plan?.id ?? null);
      const after = before + w.cost;
      const over = after > DAY_ROOM;
      const costNote = `${w.reason} ${WEIGH.day(weekday(date), before, after, DAY_ROOM)}${over ? ` ${WEIGH.over}` : ''}`;
      const leave = w.leave_by
        ? { leaveBy: clock(`${date}T${w.leave_by}`), exitNote: w.leave_reason }
        : {};
      let id = plan?.id;
      if (plan) {
        await db.update(events)
          .set({ cost: w.cost, costNote, category: sql`coalesce(${events.category}, ${w.kind})`, ...leave })
          .where(eq(events.id, plan.id));
      } else {
        [{ id }] = await db.insert(events).values({
          userId: claims.sub,
          title: w.title,
          time: range(w.starts_at, w.ends_at, claims.sub) as unknown as string,
          category: w.kind,
          cost: w.cost,
          status: 'proposed',
          withPeople: w.with,
          costNote,
          ...leave,
        }).returning({ id: events.id });
      }
      return { ...(await planDetail(db, id!)), day: { date, before, after, room: DAY_ROOM, over } };
    });
  }),
];
