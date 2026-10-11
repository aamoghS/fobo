import { Animated, StyleSheet, View } from 'react-native';

import BaseArt from '@/assets/illustrations/onboarding/bubble-bath/base.svg';
import Bubble1Art from '@/assets/illustrations/onboarding/bubble-bath/bubble-1.svg';
import Bubble2Art from '@/assets/illustrations/onboarding/bubble-bath/bubble-2.svg';
import Bubble3Art from '@/assets/illustrations/onboarding/bubble-bath/bubble-3.svg';
import Bubble4Art from '@/assets/illustrations/onboarding/bubble-bath/bubble-4.svg';
import Bubble5Art from '@/assets/illustrations/onboarding/bubble-bath/bubble-5.svg';
import DuckArt from '@/assets/illustrations/onboarding/bubble-bath/duck.svg';
import Float1Art from '@/assets/illustrations/onboarding/bubble-bath/float-1.svg';
import Float2Art from '@/assets/illustrations/onboarding/bubble-bath/float-2.svg';
import RimArt from '@/assets/illustrations/onboarding/bubble-bath/rim.svg';

import { about, lerp, useCycle, useSway, type Steps } from './motion';

const W = 180;
const H = 155;
const FRAME = { w: W, h: H };

// The foam along the rim, each puffing on its own beat.
const FOAM = [
  { Art: Bubble1Art, x: 41.5, y: 104.2, delay: 0 },
  { Art: Bubble2Art, x: 61.3, y: 100, delay: 700 },
  { Art: Bubble3Art, x: 76.3, y: 103, delay: 1400 },
  { Art: Bubble4Art, x: 121.9, y: 103, delay: 350 },
  { Art: Bubble5Art, x: 140.5, y: 104.8, delay: 1050 },
];

/** Feel like yourself again's bath (180x155): the foam puffs, two bubbles drift up and pop, the duck bobs. */
export function BubbleBath(_: { width?: number | string; height?: number | string }) {
  const duck = useSway(3000);
  // Under Reduce Motion the floating bubbles rest where they're drawn.
  const rise1 = useCycle(5200, { rest: 0.5 });
  const rise2 = useCycle(5200, { delay: 2600, rest: 0.5 });

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Layer Art={BaseArt} />
      <Layer Art={RimArt} />
      {FOAM.map(({ Art, x, y, delay }) => (
        <Foam key={x} Art={Art} x={x} y={y} delay={delay} />
      ))}
      <Layer
        Art={DuckArt}
        transform={about(FRAME, 95, 112, [{ translateY: lerp(duck, [0, -1.5]) }, { rotate: lerp(duck, ['-4deg', '3deg']) }])}
      />
      {/* Each starts low by the rim, grows as it rises past where it's drawn, then fades out near the top. */}
      <Layer
        Art={Float1Art}
        opacity={lerp(rise1, [0, 1, 1, 0], [0, 0.15, 0.75, 1])}
        transform={about(FRAME, 130.9, 80.8, [
          { translateY: lerp(rise1, [16, -18]) },
          { translateX: lerp(rise1, [0, 3, -2], [0, 0.5, 1]) },
          { scale: lerp(rise1, [0.6, 1.05]) },
        ])}
      />
      <Layer
        Art={Float2Art}
        opacity={lerp(rise2, [0, 1, 1, 0], [0, 0.15, 0.75, 1])}
        transform={about(FRAME, 147.7, 62.8, [
          { translateY: lerp(rise2, [30, -14]) },
          { translateX: lerp(rise2, [-6, -2, 2], [0, 0.5, 1]) },
          { scale: lerp(rise2, [0.6, 1.05]) },
        ])}
      />
    </View>
  );
}

function Foam({ Art, x, y, delay }: { Art: typeof BaseArt; x: number; y: number; delay: number }) {
  const puff = useSway(2800, delay);
  return <Layer Art={Art} transform={about(FRAME, x, y, [{ scale: lerp(puff, [1, 1.1]) }])} />;
}

function Layer({
  Art,
  transform,
  opacity,
}: {
  Art: typeof BaseArt;
  transform?: Steps;
  opacity?: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View style={[styles.layer, transform && { transform }, opacity && { opacity }]}>
      <Art width={W} height={H} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: W, height: H },
  layer: { position: 'absolute', left: 0, top: 0, width: W, height: H },
});
