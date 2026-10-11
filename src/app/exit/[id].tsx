import { useLocalSearchParams } from 'expo-router';

import { BottomSheet } from '@/components/BottomSheet';
import { PlanExit } from '@/screens/main/PlanExit';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BottomSheet height={0.88}>{(close) => <PlanExit id={id} onClose={() => close()} />}</BottomSheet>;
}
