import type { Step } from '@/screens/onboarding/Onboarding';

/** Onboarding answers: a starting guess, filled from the profile API when signed in (src/data/live.ts). */
export const answers: Partial<Record<Step, string>> = {};
