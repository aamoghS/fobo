import { Animated, StyleSheet, View } from 'react-native';

import BaseArt from '@/assets/illustrations/onboarding/recharging/base.svg';
import BatteryFillArt from '@/assets/illustrations/onboarding/recharging/battery-fill.svg';
import BatteryArt from '@/assets/illustrations/onboarding/recharging/battery.svg';

import { about, lerp, useRiseFall, type Steps } from './motion';

const W = 162;
const H = 155;
const FRAME = { w: W, h: H };

// The battery's centre, and the fill's left edge (it charges from there).
const BATTERY = { x: 84.8, y: 15.75 };
const FILL_LEFT = 64.19;

/** Head home's spent spirit (162x155): the battery slowly charges, swelling a touch, then drains away. */
export function Recharging(_: { width?: number | string; height?: number | string }) {
  // Under Reduce Motion it rests at the drawn charge (about 60%).
  const charge = useRiseFall({ rise: 4000, hold: 1200, fall: 7000, pause: 800, rest: 0.55 });

  const swell: Steps = about(FRAME, BATTERY.x, BATTERY.y, [{ scale: lerp(charge, [1, 1.08]) }]);
  const fill: Steps = [...swell, ...about(FRAME, FILL_LEFT, BATTERY.y, [{ scaleX: lerp(charge, [0.12, 1]) }])];

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Layer Art={BaseArt} />
      <Layer Art={BatteryArt} transform={swell} />
      <Layer Art={BatteryFillArt} transform={fill} />
    </View>
  );
}

function Layer({ Art, transform }: { Art: typeof BaseArt; transform?: Steps }) {
  return (
    <Animated.View style={[styles.layer, transform && { transform }]}>
      <Art width={W} height={H} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: W, height: H },
  layer: { position: 'absolute', left: 0, top: 0, width: W, height: H },
});
