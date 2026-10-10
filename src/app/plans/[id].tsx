import { useLocalSearchParams } from 'expo-router';

import { PlanDetail } from '@/screens/main/PlanDetail';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanDetail id={id} />;
}
