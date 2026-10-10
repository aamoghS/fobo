import { loadLive } from '@/data/live';
import { api } from '@/lib/api';
import type { Step } from '@/screens/onboarding/Onboarding';

import { answers } from './answers';

export { answers };

/** Records an answer and saves it to the profile right away (signed in), then reloads the app's data. */
export function chooseAnswer(step: Step, value: string) {
  answers[step] = value;
  void api('PATCH', '/me', { onboarding: { [step]: value } }).then((saved) => saved && loadLive());
  return value;
}
