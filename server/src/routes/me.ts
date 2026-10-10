import { upsertProfile, withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';

const EDITABLE = [
  'handle', 'name', 'character', 'timezone', 'recharge_style', 'busy_streak', 'protected_hours',
  'write_back', 'share_blocks', 'share_scores', 'onboarding',
];
const JSON_COLUMNS = new Set(['character', 'protected_hours', 'onboarding']);

// Picks allowed keys from a body and builds "col = $n" pairs, starting at $2 ($1 is the row id).
export function setClause(body: Record<string, unknown>, allowed: string[], jsonCols = new Set<string>()) {
  const keys = allowed.filter((k) => k in body);
  if (!keys.length) throw new HttpError(400, 'nothing to update');
  return {
    sql: keys.map((k, i) => `${k} = $${i + 2}`).join(', '),
    values: keys.map((k) => (jsonCols.has(k) ? JSON.stringify(body[k]) : body[k])),
  };
}

export const meRoutes = [
  // First call after sign-in creates the profile.
  route('GET', '/me', ({ pool, claims }) =>
    withUser(pool, claims, async (c) => {
      await upsertProfile(c, claims.sub);
      return (await c.query('select * from my_profile')).rows[0];
    })),

  route('PATCH', '/me', ({ pool, claims, body }) => {
    const set = setClause(body, EDITABLE, JSON_COLUMNS);
    return withUser(pool, claims, async (c) => {
      await c.query(`update profiles set ${set.sql} where id = $1`, [claims.sub, ...set.values]);
      return (await c.query('select * from my_profile')).rows[0];
    });
  }),
];
