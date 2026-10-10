import { View } from 'react-native';

import AsleepFace from '@/assets/faces/asleep.svg';
import FineFace from '@/assets/faces/fine.svg';
import type { PlanKind } from '@/features/plans/types';
import { seedFrom } from '@/lib/scrap-path';
import { color } from '@/styles/tokens';

import { Scrap } from './Scrap';

/** A plan's scrap at row size, with a face: rest dozes on its cushion, everything else looks up. */
export function MiniScrap({ kind, id, size = 32 }: { kind: PlanKind; id: string; size?: number }) {
  const rest = kind === 'rest';
  const h = rest ? size * 0.55 : size;
  const Face = rest ? AsleepFace : FineFace;
  const faceH = (rest ? 24 : 30) * (size / 46);
  return (
    <View importantForAccessibility="no-hide-descendants" style={{ width: size, height: size + 2, justifyContent: 'flex-end' }}>
      <Scrap cut={kind} width={size} height={h} seed={seedFrom(id)} />
      <View style={{ position: 'absolute', left: 0, bottom: rest ? h * 0.15 : size - faceH * 0.9 }}>
        <Face width={size} height={faceH} color={color.creatureInk} />
      </View>
    </View>
  );
}
