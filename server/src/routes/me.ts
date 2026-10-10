import { eq } from 'drizzle-orm';
import { upsertProfile, withUser } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { profiles } from '../schema.ts';

const EDITABLE = [
  'handle', 'name', 'character', 'timezone', 'rechargeStyle', 'busyStreak', 'protectedHours',
  'onboarding', 'writeBack', 'shareBlocks', 'shareScores',
] as const;

// Picks the allowed keys from a request body.
export function pick<K extends string>(body: Record<string, unknown>, allowed: readonly K[]) {
  const out = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  if (!Object.keys(out).length) throw new HttpError(400, 'nothing to update');
  return out as Partial<Record<K, any>>;
}

export const meRoutes = [
  // First call after sign-in creates the profile. Row-level security limits profiles to the caller.
  route('GET', '/me', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      await upsertProfile(db, claims.sub);
      return (await db.select().from(profiles).where(eq(profiles.id, claims.sub)))[0];
    })),

  route('PATCH', '/me', ({ pool, claims, body }) => {
    const patch = pick(body, EDITABLE);
    return withUser(pool, claims, async (db) =>
      (await db.update(profiles).set(patch).where(eq(profiles.id, claims.sub)).returning())[0]);
  }),
];
