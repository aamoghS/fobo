// Invite via link: a signed link to a public page with the plan's name and time, and who's inviting. Only
// the plan's owner can make one (row-level security), and the signature keeps other plans' links unguessable.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import { withService, withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { events } from '../schema.ts';
import { escapeHtml, page } from './pages.ts';

const sign = (id: string) =>
  createHmac('sha256', process.env.AUTH_SECRET ?? '').update(`invite:${id}`).digest('base64url').slice(0, 22);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const inviteRoutes = [
  // Answers { url } for one of the caller's plans.
  route('POST', '/plans/:id/invite', ({ pool, claims, params }) =>
    withUser(pool, claims, async (db) => {
      const plan = (await db.select({ id: events.id }).from(events).where(eq(events.id, params.id)))[0];
      if (!plan) throw new HttpError(404, 'not found');
      const base = (process.env.PUBLIC_API_URL ?? '').replace(/\/$/, '');
      return { url: `${base}/invite/${plan.id}.${sign(plan.id)}` };
    })),
];

const unknown = () => page('Fobo invite', '<h1>This invite link doesn’t work</h1><p>Ask whoever sent it for a new one.</p>', 404);

/** GET /invite/<id>.<signature>: the invite page, without signing in. */
export async function invitePage(token: string, pool: pg.Pool): Promise<Response> {
  const [id, mac] = token.split('.');
  if (!id || !mac || !UUID.test(id)) return unknown();
  const expected = Buffer.from(sign(id));
  if (Buffer.from(mac).length !== expected.length || !timingSafeEqual(Buffer.from(mac), expected)) return unknown();
  const plan = await withService(pool, async (db) => (await db.execute<{ title: string; host: string | null; when: string }>(sql`
    select e.title, p.name as host,
           to_char(lower(e.time) at time zone p.timezone, 'FMDay, FMDD FMMonth · FMHH12:MI AM') || ' to '
             || to_char(upper(e.time) at time zone p.timezone, 'FMHH12:MI AM') as when
    from events e join profiles p on p.id = e.user_id
    where e.id = ${id} and e.status <> 'declined'`)).rows[0]);
  if (!plan) return unknown();
  return page(`${plan.title} · Fobo`, `
<h1>${escapeHtml(plan.title)}</h1>
<p>${escapeHtml(plan.when)}</p>
<p>${plan.host ? `${escapeHtml(plan.host)} invited you.` : 'You’re invited.'}</p>
<p><a href="/">Fobo</a> plans around your energy, not just your free time.</p>`);
}
