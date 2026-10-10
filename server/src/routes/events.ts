import { withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { setClause } from './me.ts';

// Events store time as a tstzrange; the API speaks starts_at / ends_at.
export const EVENT_COLUMNS = `id, title, lower(time) as starts_at, upper(time) as ends_at, category, cost,
  visibility, protected, declined, source, connection_id, external_id`;

const EDITABLE = ['title', 'category', 'cost', 'visibility', 'protected', 'declined'];
// Google keeps title and time; Fobo keeps the rest.
const GOOGLE_LOCKED = new Set(['title', 'starts_at', 'ends_at']);

export const eventRoutes = [
  route('GET', '/events', ({ pool, claims, query }) => {
    const from = query.get('from');
    const to = query.get('to');
    if (!from || !to) throw new HttpError(400, 'from and to are required');
    return withUser(pool, claims, async (c) =>
      (await c.query(
        `select ${EVENT_COLUMNS} from events where time && tstzrange($1, $2) order by lower(time)`,
        [from, to],
      )).rows);
  }),

  route('GET', '/events/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (c) => {
      const row = (await c.query(`select ${EVENT_COLUMNS} from events where id = $1`, [params.id])).rows[0];
      if (!row) throw new HttpError(404, 'not found');
      return row;
    })),

  route('POST', '/events', ({ pool, claims, body }) => {
    if (!body.title || !body.starts_at || !body.ends_at) {
      throw new HttpError(400, 'title, starts_at and ends_at are required');
    }
    return withUser(pool, claims, async (c) =>
      (await c.query(
        `insert into events (user_id, title, time, category, cost, visibility, protected)
         values ($1, $2, tstzrange($3, $4), $5, coalesce($6, 0), coalesce($7, 'private'), coalesce($8, false))
         returning ${EVENT_COLUMNS}`,
        [claims.sub, body.title, body.starts_at, body.ends_at, body.category ?? null, body.cost,
          body.visibility, body.protected],
      )).rows[0]);
  }),

  route('PATCH', '/events/:id', ({ pool, claims, params, body }) =>
    withUser(pool, claims, async (c) => {
      const current = (await c.query('select source from events where id = $1', [params.id])).rows[0];
      if (!current) throw new HttpError(404, 'not found');
      if (current.source === 'google' && Object.keys(body).some((k) => GOOGLE_LOCKED.has(k))) {
        throw new HttpError(400, 'title and time come from Google Calendar');
      }
      const timed = body.starts_at && body.ends_at;
      const rest = Object.keys(body).some((k) => EDITABLE.includes(k));
      if (!timed && !rest) throw new HttpError(400, 'nothing to update');
      if (rest) {
        const set = setClause(body, EDITABLE);
        await c.query(`update events set ${set.sql} where id = $1`, [params.id, ...set.values]);
      }
      if (timed) {
        await c.query('update events set time = tstzrange($2, $3) where id = $1',
          [params.id, body.starts_at, body.ends_at]);
      }
      return (await c.query(`select ${EVENT_COLUMNS} from events where id = $1`, [params.id])).rows[0];
    })),
];
