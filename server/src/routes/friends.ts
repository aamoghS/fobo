import { withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';

const cleanHandle = (h: unknown) => String(h ?? '').trim().toLowerCase().replace(/^@/, '');

export const friendRoutes = [
  // Accepted friends, requests to me, and requests I sent, with public profile fields.
  route('GET', '/friends', ({ pool, claims }) =>
    withUser(pool, claims, async (c) => {
      const { rows } = await c.query(
        `select f.requester_id, f.status, p.id, p.handle, p.name, p.character
         from friendships f
         join profile_public p
           on p.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end`,
        [claims.sub],
      );
      const pick = (test: (r: any) => boolean) =>
        rows.filter(test).map(({ id, handle, name, character }) => ({ id, handle, name, character }));
      return {
        friends: pick((r) => r.status === 'accepted'),
        incoming: pick((r) => r.status === 'pending' && r.requester_id !== claims.sub),
        outgoing: pick((r) => r.status === 'pending' && r.requester_id === claims.sub),
      };
    })),

  route('GET', '/people/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (c) => {
      const row = (await c.query('select * from profile_public where id = $1', [params.id])).rows[0];
      if (!row) throw new HttpError(404, 'not found');
      return row;
    })),

  // Add by exact handle: creates a pending request.
  route('POST', '/friends', ({ pool, claims, body }) =>
    withUser(pool, claims, async (c) => {
      const other = (await c.query('select id from profile_public where handle = $1',
        [cleanHandle(body.handle)])).rows[0];
      if (!other || other.id === claims.sub) throw new HttpError(404, 'no one with that handle');
      const { rowCount } = await c.query(
        `insert into friendships (requester_id, addressee_id) values ($1, $2) on conflict do nothing`,
        [claims.sub, other.id],
      );
      if (!rowCount) throw new HttpError(409, 'already friends or asked');
      return { id: other.id };
    })),

  route('POST', '/friends/:id/accept', ({ pool, claims, params }) =>
    withUser(pool, claims, async (c) => {
      const { rowCount } = await c.query(
        `update friendships set status = 'accepted'
         where requester_id = $1 and addressee_id = $2 and status = 'pending'`,
        [params.id, claims.sub],
      );
      if (!rowCount) throw new HttpError(404, 'no request from them');
    })),

  // Unfriend, cancel, or turn down: the row goes either way.
  route('DELETE', '/friends/:id', ({ pool, claims, params }) =>
    withUser(pool, claims, async (c) => {
      await c.query(
        `delete from friendships
         where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`,
        [claims.sub, params.id],
      );
    })),

  // ?date=YYYY-MM-DD in the friend's timezone.
  route('GET', '/friends/:id/blocks', ({ pool, claims, params, query }) =>
    withUser(pool, claims, async (c) =>
      (await c.query(
        `select lower(span) as starts_at, upper(span) as ends_at, title, category
         from friend_blocks($1, $2)`,
        [params.id, query.get('date')],
      )).rows)),

  // Works for an accepted friend who shares scores, or for the caller's own id.
  route('GET', '/scores/:id', ({ pool, claims, params, query }) =>
    withUser(pool, claims, async (c) =>
      (await c.query(
        `select to_char(day, 'YYYY-MM-DD') as day, load, room from day_scores($1, $2, $3)`,
        [params.id, query.get('from'), query.get('to')],
      )).rows)),
];
