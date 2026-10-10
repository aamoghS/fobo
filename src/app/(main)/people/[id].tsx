import { useLocalSearchParams } from 'expo-router';

import { PersonDetail } from '@/screens/main/PersonDetail';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PersonDetail id={id} />;
}
