import { Redirect, useLocalSearchParams } from 'expo-router';

import { OnboardingStep, STEPS, type Step } from '@/screens/onboarding/Onboarding';

export default function Route() {
  const { step, edit } = useLocalSearchParams<{ step: string; edit?: string }>();
  if (!STEPS.includes(step as Step)) return <Redirect href="/onboarding/start" />;
  return <OnboardingStep step={step as Step} editing={edit === '1'} />;
}
