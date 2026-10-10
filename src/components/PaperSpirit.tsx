import { View } from 'react-native';

import asleep from '@/assets/characters/asleep.svg';
import bright from '@/assets/characters/bright.svg';
import fine from '@/assets/characters/fine.svg';
import spent from '@/assets/characters/spent.svg';
import stretched from '@/assets/characters/stretched.svg';
import work from '@/assets/characters/work.svg';
import type { Mood } from '@/lib/energy';

// Character set 34:825. Each SVG is the full 96x104 frame, paper shadow included.
const art = { bright, fine, stretched, spent, asleep, work };

export type SpiritMood = Mood | 'work';

const LABELS: Record<SpiritMood, string> = {
  bright: 'Feeling bright',
  fine: 'Feeling fine',
  stretched: 'Feeling stretched',
  spent: 'Feeling spent',
  asleep: 'Asleep',
  work: 'Work',
};

type Props = {
  mood: SpiritMood;
  /** Rendered width. Height keeps the 96:104 frame. */
  size?: number;
  /** Set when the mood carries meaning on screen; otherwise the character is decorative. */
  conveysState?: boolean;
};

export function PaperSpirit({ mood, size = 96, conveysState = false }: Props) {
  const Art = art[mood];
  const height = (size * 104) / 96;
  return (
    <View
      accessible={conveysState}
      accessibilityRole={conveysState ? 'image' : undefined}
      accessibilityLabel={conveysState ? LABELS[mood] : undefined}
      importantForAccessibility={conveysState ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height }}>
      <Art width={size} height={height} />
    </View>
  );
}
