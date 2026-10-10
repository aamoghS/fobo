import { useLocalSearchParams } from 'expo-router';

import { getPerson } from '@/data/people';
import { Placeholder } from '@/screens/Placeholder';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Placeholder name={getPerson(id)?.name ?? 'Person'} node="387:1613" />;
}
