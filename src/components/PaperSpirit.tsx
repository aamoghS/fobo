import { View } from 'react-native';

import asleep from '@/assets/characters/asleep.svg';
import bright from '@/assets/characters/bright.svg';
import fine from '@/assets/characters/fine.svg';
import spent from '@/assets/characters/spent.svg';
import stretched from '@/assets/characters/stretched.svg';
import work from '@/assets/characters/work.svg';
import type { Mood } from '@/lib/energy';
import { color as tokens } from '@/styles/tokens';

// Character set 34:825. Each SVG is the full 96x104 frame, paper shadow included.
const art = { bright, fine, stretched, spent, asleep, work };

export type SpiritMood = Mood | 'work';

// Body fill is currentColor in the art; by default it is the mood's colour.
const MOOD_COLOR: Record<SpiritMood, string> = {
  bright: tokens.moodBright,
  fine: tokens.moodFine,
  stretched: tokens.moodStretched,
  spent: tokens.moodSpent,
  asleep: tokens.moodAsleep,
  work: tokens.scrapWork,
};

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
  /** Body colour override (Edit Character). */
  color?: string;
  /** Vertical stretch from the bottom, 1 = as drawn (Edit Character height). */
  stretch?: number;
};

export function PaperSpirit({ mood, size = 96, conveysState = false, color, stretch = 1 }: Props) {
  const Art = art[mood];
  const height = (size * 104) / 96;
  return (
    <View
      accessible={conveysState}
      accessibilityRole={conveysState ? 'image' : undefined}
      accessibilityLabel={conveysState ? LABELS[mood] : undefined}
      importantForAccessibility={conveysState ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height }}>
      <View style={stretch !== 1 && { transform: [{ translateY: (height * (1 - stretch)) / 2 }, { scaleY: stretch }] }}>
        <Art width={size} height={height} color={color ?? MOOD_COLOR[mood]} />
      </View>
    </View>
  );
}
