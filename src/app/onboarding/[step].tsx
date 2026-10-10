import { useLocalSearchParams } from 'expo-router';

import { Placeholder } from '@/screens/Placeholder';

export default function Route() {
  const { step } = useLocalSearchParams<{ step: string }>();
  return <Placeholder name={`Onboarding · ${step}`} />;
}
