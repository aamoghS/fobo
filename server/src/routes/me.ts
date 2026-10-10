import { eq, sql } from 'drizzle-orm';
import { upsertProfile, withUser, type Db } from '../db.ts';
import { HttpError, route } from '../http.ts';
import { profiles } from '../schema.ts';

const EDITABLE = [
  'handle', 'name', 'character', 'timezone', 'rechargeStyle', 'busyStreak', 'protectedHours',
  'onboarding', 'writeBack', 'shareBlocks', 'shareScores', 'bio', 'tint', 'stressRelief',
] as const;

// The app's options, from src/data/profile.ts (Edit character) and src/screens/onboarding/Onboarding.tsx.
const SHAPES = ['slab', 'drip', 'flower', 'cloud', 'square'];
const SWATCHES = ['moodFine', 'moodStretched', 'moodAsleep', 'moodSpent', 'scrapWork', 'paintViolet', 'paintCharcoal'];
const EYES = ['sleepy', 'happy', 'bored'];
const ONBOARDING: Record<string, string[] | null> = {
  recharge: ['alone', 'depends', 'people'],
  'head-home': ['In the first hour', 'After 1 to 2 hours', 'After 2 to 3 hours', 'I stayed happily to the end'],
  yourself: ['Same evening', 'Next morning', 'After a day', '2 to 3 days', 'Longer'],
  compare: null, // a plan id
};

// Picks the allowed keys from a request body.
export function pick<K extends string>(body: Record<string, unknown>, allowed: readonly K[]) {
  const out = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  if (!Object.keys(out).length) throw new HttpError(400, 'nothing to update');
  return out as Partial<Record<K, any>>;
}

function checkCharacter(c: any) {
  const ok = c && SHAPES.includes(c.shape) && SWATCHES.includes(c.color) && EYES.includes(c.eyes)
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
    if ('onboarding' in patch) {
      checkOnboarding(patch.onboarding);
      // Answers merge into the saved ones, so changing one answer keeps the rest.
      const answers = patch.onboarding as Record<string, string>;
      patch.onboarding = sql`coalesce(${profiles.onboarding}, '{}'::jsonb) || ${JSON.stringify(answers)}::jsonb`;
      if (answers.recharge) patch.rechargeStyle = answers.recharge;
    }
    return withUser(pool, claims, async (db) => {
      await db.update(profiles).set(patch).where(eq(profiles.id, claims.sub));
      return me(db, claims.sub);
    });
  }),
];
