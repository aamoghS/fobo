import { EYES, ONBOARDING, SHAPES, SWATCHES, TINTS } from '@fobo/core/options';
import { eq, inArray, sql } from 'drizzle-orm';
import { upsertProfile, withService, withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { calendarConnections, calendarSync, profiles } from '../schema.ts';

const EDITABLE = [
  'handle', 'name', 'character', 'timezone', 'rechargeStyle', 'busyStreak', 'protectedHours',
  'onboarding', 'writeBack', 'shareBlocks', 'shareScores', 'bio', 'tint', 'stressRelief',
] as const;

// The app's options (Edit Character, onboarding, avatar tints), shared through @fobo/core.
const SHAPE_KEYS: readonly string[] = SHAPES.map((s) => s.key);
const SWATCH_KEYS: readonly string[] = SWATCHES;
const EYE_KEYS: readonly string[] = EYES.map((e) => e.key);
const TINT_KEYS: readonly string[] = TINTS;

/** True for an IANA timezone name the runtime knows, like 'America/New_York'. */
export function isTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Picks the allowed keys from a request body.
export function pick<K extends string>(body: Record<string, unknown>, allowed: readonly K[]) {
  const out = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  if (!Object.keys(out).length) throw new HttpError(400, 'nothing to update');
  return out as Partial<Record<K, any>>;
}

function checkCharacter(c: any) {
  const ok = c && SHAPE_KEYS.includes(c.shape) && SWATCH_KEYS.includes(c.color) && EYE_KEYS.includes(c.eyes)
    && typeof c.height === 'number' && c.height >= 0 && c.height <= 1;
  if (!ok) throw new HttpError(400, 'character needs shape, color, eyes and a height from 0 to 1');
}

function checkOnboarding(answers: any) {
  const ok = answers && typeof answers === 'object' && Object.entries(answers).every(([step, value]) =>
    step in ONBOARDING && typeof value === 'string' && (!ONBOARDING[step] || ONBOARDING[step]!.includes(value)));
  if (!ok) throw new HttpError(400, 'unknown onboarding step or answer');
}

// The caller's profile, plus the email they signed in with (Settings).
async function me(db: Db, id: string) {
  const row = (await db.select().from(profiles).where(eq(profiles.id, id)))[0];
  const { rows } = await db.execute<{ email: string | null }>(sql`select app.my_email() as email`);
  return { ...row, email: rows[0]?.email ?? null };
}

export const meRoutes = [
  // First call after sign-in creates the profile. Row-level security limits profiles to the caller.
  route('GET', '/me', ({ pool, claims }) =>
    withUser(pool, claims, async (db) => {
      await upsertProfile(db, claims.sub);
      return me(db, claims.sub);
    })),

  route('PATCH', '/me', ({ pool, claims, body }) => {
    const patch = pick(body, EDITABLE);
    if ('character' in patch) checkCharacter(patch.character);
    if ('timezone' in patch && !isTimezone(patch.timezone)) throw new HttpError(400, 'unknown timezone');
    if ('tint' in patch && patch.tint !== null && !TINT_KEYS.includes(patch.tint)) throw new HttpError(400, 'unknown tint');
    if ('onboarding' in patch) {
      checkOnboarding(patch.onboarding);
      // Answers merge into the saved ones, so changing one answer keeps the rest.
      const answers = patch.onboarding as Record<string, string>;
      patch.onboarding = sql`coalesce(${profiles.onboarding}, '{}'::jsonb) || ${JSON.stringify(answers)}::jsonb`;
      if (answers.recharge) patch.rechargeStyle = answers.recharge;
    }
    return withUser(pool, claims, async (db) => {
      const before = (await db.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.id, claims.sub)))[0];
      await db.update(profiles).set(patch).where(eq(profiles.id, claims.sub));
      // All-day Google events were placed in the old timezone: the next sync reads every calendar in full.
      if ('timezone' in patch && before && before.timezone !== patch.timezone) {
        await withService(pool, (svc) => svc.delete(calendarSync).where(inArray(calendarSync.connectionId,
          svc.select({ id: calendarConnections.id }).from(calendarConnections).where(eq(calendarConnections.userId, claims.sub)))));
      }
      return me(db, claims.sub);
    });
  }),
];
