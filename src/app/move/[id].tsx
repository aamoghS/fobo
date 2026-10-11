import { useLocalSearchParams } from 'expo-router';

import { BottomSheet } from '@/components/BottomSheet';
import { MovePlan } from '@/screens/main/MovePlan';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BottomSheet height={0.8}>{(close) => <MovePlan id={id} onClose={() => close()} />}</BottomSheet>;
}
