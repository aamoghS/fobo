import { useLocalSearchParams } from 'expo-router';

import { PlanForm } from '@/screens/main/PlanForm';

/** /plans/new adds a plan; ?id= edits one, with ?focus=time (Move it) or exit (leave-by). ?then=back returns to the opener after saving. */
export default function Route() {
  const { id, focus, then } = useLocalSearchParams<{ id?: string; focus?: string; then?: string }>();
  return <PlanForm id={id} focus={focus} then={then} />;
}
