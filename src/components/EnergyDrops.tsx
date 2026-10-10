import { View } from 'react-native';

import energy1 from '@/assets/energy/energy-1.svg';
import energy2 from '@/assets/energy/energy-2.svg';
import energy3 from '@/assets/energy/energy-3.svg';
import { color } from '@/styles/tokens';

// "Energy" frames from Plans · Social (442:2461): 42x26, drops right-aligned.
const art = { 1: energy1, 2: energy2, 3: energy3 };

export function EnergyDrops({ count }: { count: 1 | 2 | 3 }) {
  const Art = art[count];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Energy: ${count} of 3`}
      style={{ width: 42, height: 26 }}>
      <Art width={42} height={26} color={color.ink} />
    </View>
  );
}
