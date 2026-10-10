import Svg, { Path } from 'react-native-svg';

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
  /** Paints the scrap in another kind's colour, e.g. a work plan with a crown cut. */
  fill?: string;
};

/** One scrap of paper = one plan. Carries --shadow-paper as an offset copy underneath. */
export function Scrap({ cut, past = false, width, height, seed = 1, fill: paint }: Props) {
  const d = scrapPath(cut, width, height, seed);
  const fill = past && cut !== 'rest' ? color.scrapPast : (paint ?? scrapColor[cut]);
  return (
    <Svg width={width} height={height + paperShadow.y} viewBox={`0 0 ${width} ${height + paperShadow.y}`}>
      {/* A same-colour round-joined stroke softens the corners, like torn paper rather than cut card. */}
      <Path d={d} fill={paperShadow.color} stroke={paperShadow.color} strokeWidth={2} strokeLinejoin="round" transform={`translate(${paperShadow.x} ${paperShadow.y})`} />
      <Path d={d} fill={fill} stroke={fill} strokeWidth={2.5} strokeLinejoin="round" />
    </Svg>
  );
}
