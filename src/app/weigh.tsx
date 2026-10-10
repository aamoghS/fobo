import { BottomSheet } from '@/components/BottomSheet';
import { WeighPlan } from '@/screens/main/WeighPlan';

export default function Route() {
  // No header: the grabber and the dimmed backdrop close it.
  return <BottomSheet>{() => <WeighPlan />}</BottomSheet>;
}
