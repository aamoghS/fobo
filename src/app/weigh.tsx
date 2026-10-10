import { BottomSheet } from '@/components/BottomSheet';
import { WeighPlan } from '@/screens/main/WeighPlan';

export default function Route() {
  return <BottomSheet>{(close) => <WeighPlan onClose={() => close()} onAdded={() => close('/week')} />}</BottomSheet>;
}
