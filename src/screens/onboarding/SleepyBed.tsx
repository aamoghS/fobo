import { Animated, StyleSheet, View } from 'react-native';

import BedArt from '@/assets/illustrations/onboarding/sleepy-bed/bed.svg';
import BlanketArt from '@/assets/illustrations/onboarding/sleepy-bed/blanket.svg';
import SleeperArt from '@/assets/illustrations/onboarding/sleepy-bed/sleeper.svg';
import ZBigArt from '@/assets/illustrations/onboarding/sleepy-bed/z-big.svg';
import ZMediumArt from '@/assets/illustrations/onboarding/sleepy-bed/z-medium.svg';
import ZSmallArt from '@/assets/illustrations/onboarding/sleepy-bed/z-small.svg';

import { about, lerp, useCycle, useSway, type Steps } from './motion';

const W = 147;
const H = 155;
const FRAME = { w: W, h: H };

// Each Z's centre in the frame, smallest first.
const ZS = [
  { Art: ZSmallArt, x: 95.5, y: 47.5 },
  { Art: ZMediumArt, x: 113, y: 35.5 },
  { Art: ZBigArt, x: 135, y: 20.5 },
];

/** Recharge's sleeper (147x155): breathes slowly under the blanket while the Z's drift up one by one. */
export function SleepyBed(_: { width?: number | string; height?: number | string }) {
  const breath = useSway(3200);
  // Under Reduce Motion the Z's rest where they're all showing.
  const zz = useCycle(3000, { rest: 0.7 });

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Layer Art={BedArt} />
      <Layer Art={SleeperArt} transform={about(FRAME, 71.7, 126.5, [{ scaleY: lerp(breath, [1, 1.03]) }])} />
      <Layer Art={BlanketArt} />
      {ZS.map(({ Art, x, y }, i) => {
        // Each Z fades in a beat after the last, floats up as it grows, then they all fade together.
        const start = i * 0.18;
        return (
          <Layer
            key={i}
            Art={Art}
            opacity={lerp(zz, [0, 1, 1, 0], [start, start + 0.15, 0.8, 0.95])}
            transform={about(FRAME, x, y, [
              { translateY: lerp(zz, [4, -3], [start, 0.95]) },
              { scale: lerp(zz, [0.7, 1.05], [start, 0.95]) },
            ])}
          />
        );
      })}
    </View>
  );
}

function Layer({
  Art,
  transform,
  opacity,
}: {
  Art: typeof BedArt;
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
