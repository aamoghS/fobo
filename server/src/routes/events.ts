import { withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';

// Plans are stored in events (time as a tstzrange) and served in the app's Plan shape
// (src/features/plans/types.ts), plus visibility for the three friend-sharing levels.
export const PLAN_COLUMNS = `id, title, coalesce(category, 'work') as kind, lower(time) as start, upper(time) as end,
  cost as "energyCost", status, visibility <> 'private' as shared, visibility, leave_by as "leaveBy",
  with_people as with, protected, source`;

// App field -> column. start/end are handled together as the time range.
const FIELDS: Record<string, string> = {
  title: 'title', kind: 'category', energyCost: 'cost', status: 'status', visibility: 'visibility',
  leaveBy: 'leave_by', with: 'with_people', protected: 'protected',
};
// Google keeps title and time; Fobo keeps the rest.
const GOOGLE_LOCKED = new Set(['title', 'start', 'end']);

// "shared" is the app's on/off switch; on means busy (block and colour, no title).
function normalize(body: Record<string, unknown>) {
  const out = { ...body };
  if (typeof out.shared === 'boolean' && out.visibility === undefined) {
    out.visibility = out.shared ? 'busy' : 'private';
  }
  return out;
}

export const eventRoutes = [
  route('GET', '/plans', ({ pool, claims, query }) => {
    const from = query.get('from');
    const to = query.get('to');
    if (!from || !to) throw new HttpError(400, 'from and to are required');
    return withUser(pool, claims, async (c) =>
      (await c.query(
        `select ${PLAN_COLUMNS} from events where time && tstzrange($1, $2) order by lower(time)`,
        [from, to],
      )).rows);
  }),

  route('GET', '/plans/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (c) => {
      const row = (await c.query(`select ${PLAN_COLUMNS} from events where id = $1`, [params.id])).rows[0];
      if (!row) throw new HttpError(404, 'not found');
      return row;
    })),

  route('POST', '/plans', ({ pool, claims, body: raw }) => {
    const body = normalize(raw);
    if (!body.title || !body.start || !body.end) throw new HttpError(400, 'title, start and end are required');
    return withUser(pool, claims, async (c) =>
      (await c.query(
        `insert into events (user_id, title, time, category, cost, status, visibility, leave_by, with_people, protected)
         values ($1, $2, tstzrange($3, $4), $5, coalesce($6::numeric, 0), coalesce($7, 'accepted'), coalesce($8, 'busy'),
                 $9, coalesce($10::text[], '{}'), coalesce($11, false))
         returning ${PLAN_COLUMNS}`,
        [claims.sub, body.title, body.start, body.end, body.kind ?? null, body.energyCost, body.status,
          body.visibility, body.leaveBy ?? null, body.with, body.protected],
      )).rows[0]);
  }),

  route('PATCH', '/plans/:id', ({ pool, claims, params, body: raw }) =>
    withUser(pool, claims, async (c) => {
      const body = normalize(raw);
      const current = (await c.query('select source from events where id = $1', [params.id])).rows[0];
      if (!current) throw new HttpError(404, 'not found');
      if (current.source === 'google' && Object.keys(body).some((k) => GOOGLE_LOCKED.has(k))) {
        throw new HttpError(400, 'title and time come from Google Calendar');
      }
      const keys = Object.keys(FIELDS).filter((k) => k in body);
      const timed = body.start !== undefined && body.end !== undefined;
      if (!keys.length && !timed) throw new HttpError(400, 'nothing to update');
      if (keys.length) {
        await c.query(
          `update events set ${keys.map((k, i) => `${FIELDS[k]} = $${i + 2}`).join(', ')} where id = $1`,
          [params.id, ...keys.map((k) => body[k])],
        );
      }
      if (timed) {
        await c.query('update events set time = tstzrange($2, $3) where id = $1', [params.id, body.start, body.end]);
      }
      return (await c.query(`select ${PLAN_COLUMNS} from events where id = $1`, [params.id])).rows[0];
    })),
];
