import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import BadgeBlue from '@/assets/profile/badge-blue.svg';
import BadgeGreen from '@/assets/profile/badge-green.svg';
import BadgePink from '@/assets/profile/badge-pink.svg';
import BadgeRed from '@/assets/profile/badge-red.svg';
import type { Achievement } from '@/data/profile';
import { color } from '@/styles/tokens';

import { Icon } from './Icon';

const art = { red: BadgeRed, pink: BadgePink, green: BadgeGreen, blue: BadgeBlue };
// The badges' own paper (badge-*.svg), for the ribbon tails.
const paper = { red: color.moodSpent, pink: color.moodAsleep, green: color.moodFine, blue: color.scrapWork };

// The badge art's frame, and its white face (Rectangle 3).
const W = 92.82;
const H = 95;
const FACE = { x: 46.94, y: 44.03, r: 22.46 };
// With tails, the frame runs on below the star.
const H_RIBBON = 120;

type Props = {
  badge: Achievement['badge'];
  icon: Achievement['icon'];
  /** Rendered width; the badge keeps its proportions. */
  size?: number;
  /** Two ribbon tails hanging below, for a badge shown on its own. */
  ribbon?: boolean;
  /** Not earned yet: faded, its icon in grey. */
  locked?: boolean;
};

/**
 * An achievement badge: the Profile badge art (443:3735) with its icon on the white face, made more
 * of a medal with a stitched ring, a soft shine and, when shown large, ribbon tails.
 */
export function Medal({ badge, icon, size = 93, ribbon = false, locked = false }: Props) {
  const k = size / W;
  const tall = ribbon && !locked;
  const h = (tall ? H_RIBBON : H) * k;
  const Art = art[badge];
  return (
    <View style={{ width: size, height: h, opacity: locked ? 0.35 : 1 }} importantForAccessibility="no-hide-descendants">
      {tall && (
        <Svg width={size} height={h} viewBox={`0 0 ${W} ${H_RIBBON}`} style={{ position: 'absolute' }}>
          <G fill={paper[badge]}>
            <Path d="M30 62 L19 118 L30.5 110 L41 117 L47.5 74 Z" />
            <Path d="M62.8 62 L73.8 118 L62.3 110 L51.8 117 L45.3 74 Z" />
          </G>
          {/* The tails sit in the badge's shadow, a shade darker than its face. */}
          <G fill={color.creatureInk} fillOpacity={0.22}>
            <Path d="M30 62 L19 118 L30.5 110 L41 117 L47.5 74 Z" />
            <Path d="M62.8 62 L73.8 118 L62.3 110 L51.8 117 L45.3 74 Z" />
          </G>
        </Svg>
      )}
      <Art width={size} height={H * k} />
      {!locked && (
        <Svg width={size} height={H * k} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Circle cx={FACE.x} cy={FACE.y} r={28.6} fill="none" stroke={color.paper} strokeOpacity={0.6} strokeWidth={1.3} strokeDasharray="2.6 2.6" />
          <Circle cx={FACE.x} cy={FACE.y} r={FACE.r - 1} fill="none" stroke={color.creatureInk} strokeOpacity={0.12} strokeWidth={2} />
          <Path d="M17 34 A31 31 0 0 1 33 15" fill="none" stroke={color.paper} strokeOpacity={0.45} strokeWidth={3.2} strokeLinecap="round" />
        </Svg>
      )}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: (FACE.x - FACE.r) * k, top: (FACE.y - FACE.r) * k, width: FACE.r * 2 * k, height: FACE.r * 2 * k, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={Math.round(FACE.r * 1.1 * k)} color={locked ? color.ink3 : color.ink} />
      </View>
    </View>
  );
}
