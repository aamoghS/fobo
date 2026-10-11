import { View } from 'react-native';

import asleep from '@/assets/characters/asleep.svg';
import bright from '@/assets/characters/bright.svg';
import fine from '@/assets/characters/fine.svg';
import spent from '@/assets/characters/spent.svg';
import stretched from '@/assets/characters/stretched.svg';
import work from '@/assets/characters/work.svg';
import bodyAsleep from '@/assets/characters/body-asleep.svg';
import bodyBright from '@/assets/characters/body-bright.svg';
import bodyFine from '@/assets/characters/body-fine.svg';
import bodySpent from '@/assets/characters/body-spent.svg';
import bodyStretched from '@/assets/characters/body-stretched.svg';
import bodyWork from '@/assets/characters/body-work.svg';
import BoredEyes from '@/assets/profile/eyes-bored.svg';
import HappyEyes from '@/assets/profile/eyes-happy.svg';
import SleepyEyes from '@/assets/profile/eyes-sleepy.svg';
import type { Mood } from '@/lib/energy';
import { color as tokens } from '@/styles/tokens';

// Character set 34:825. Each SVG is the full 96x104 frame, paper shadow included.
const art = { bright, fine, stretched, spent, asleep, work };

// The same art with its eyes taken out (mouths kept), for a character with eyes of its own.
const body = { bright: bodyBright, fine: bodyFine, stretched: bodyStretched, spent: bodySpent, asleep: bodyAsleep, work: bodyWork };

/** Edit Character's eye styles (profile/eyes-*.svg), at their drawn size in the 96-unit frame. */
export const EYE_ART = {
  sleepy: { Art: SleepyEyes, w: 39.1, h: 6.5 },
  happy: { Art: HappyEyes, w: 35.1, h: 15.4 },
  bored: { Art: BoredEyes, w: 37.1, h: 17.7 },
} as const;
export type SpiritEyes = keyof typeof EYE_ART;

// Where each body's own eyes sat: the centre of the eye pair, in the 96x104 frame.
const EYE_AT: Record<SpiritMood, { x: number; y: number }> = {
  asleep: { x: 48, y: 75.5 },
  bright: { x: 48, y: 62 },
  fine: { x: 48, y: 54.8 },
  spent: { x: 48, y: 54.8 },
  stretched: { x: 48, y: 46 },
  work: { x: 48.6, y: 61.4 },
};

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
  /** Swap the drawn eyes for one of Edit Character's styles. */
  eyes?: SpiritEyes;
};

export function PaperSpirit({ mood, size = 96, conveysState = false, color, stretch = 1, eyes }: Props) {
  const Art = eyes ? body[mood] : art[mood];
  const k = size / 96;
  const eye = eyes && EYE_ART[eyes];
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
        {eye && (
          <View style={{ position: 'absolute', left: (EYE_AT[mood].x - eye.w / 2) * k, top: (EYE_AT[mood].y - eye.h / 2) * k }}>
            <eye.Art width={eye.w * k} height={eye.h * k} color={tokens.creatureInk} />
          </View>
        )}
      </View>
    </View>
  );
}
