import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { scrapPath, type ScrapCut } from '@/lib/scrap-path';
import { paperShadow } from '@/styles/shadow';
import { color } from '@/styles/tokens';

export const scrapColor: Record<ScrapCut, string> = {
  work: color.scrapWork,
  social: color.scrapSocial,
  obligation: color.scrapObligation,
  enjoy: color.scrapEnjoy,
  rest: color.scrapRest,
  past: color.scrapPast,
};

type Props = {
  /** Top cut. Past plans keep their kind's cut and drain to kraft grey. */
  cut: ScrapCut;
  past?: boolean;
  width: number;
  height: number;
  seed?: number;
};

/** One scrap of paper = one plan. Carries --shadow-paper as an offset copy underneath. */
export function Scrap({ cut, past = false, width, height, seed = 1 }: Props) {
  const drained = past && cut !== 'rest';
  const d = scrapPath(drained ? 'past' : cut, width, height, seed);
  const fill = drained ? color.scrapPast : scrapColor[cut];
  const sheen = useId();
  return (
    <Svg width={width} height={height + paperShadow.y} viewBox={`0 0 ${width} ${height + paperShadow.y}`}>
      {/* A same-colour round-joined stroke softens the corners, like torn paper rather than cut card. */}
      <Path d={d} fill={paperShadow.color} stroke={paperShadow.color} strokeWidth={2} strokeLinejoin="round" transform={`translate(${paperShadow.x} ${paperShadow.y})`} />
      <Path d={d} fill={fill} stroke={fill} strokeWidth={2.5} strokeLinejoin="round" />
      {/* A light falls across the paper from the top left. */}
      <Defs>
        <LinearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color.paper} stopOpacity={0.2} />
          <Stop offset="0.75" stopColor={color.paper} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${sheen})`} />
    </Svg>
  );
}
