import { loadLive } from '@/data/live';
import { api } from '@/lib/api';
import type { Step } from '@/screens/onboarding/Onboarding';

/** Onboarding answers: a starting guess, filled from the profile API when signed in (src/data/live.ts). */
export const answers: Partial<Record<Step, string>> = {};

/** Records an answer and saves it to the profile right away (signed in), then reloads the app's data. */
export function chooseAnswer(step: Step, value: string) {
  answers[step] = value;
  void api('PATCH', '/me', { onboarding: { [step]: value } }).then((saved) => saved && loadLive());
  return value;
}
