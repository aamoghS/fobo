import { useLocalSearchParams } from 'expo-router';

import { PlanForm } from '@/screens/main/PlanForm';

/** /plans/new adds a plan; ?id= edits one, with ?focus=time (Move it) or exit (leave-by). */
export default function Route() {
  const { id, focus } = useLocalSearchParams<{ id?: string; focus?: string }>();
  return <PlanForm id={id} focus={focus} />;
}
