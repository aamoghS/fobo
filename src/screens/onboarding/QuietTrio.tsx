import { Animated, StyleSheet, View } from 'react-native';

import BlueArt from '@/assets/illustrations/onboarding/quiet-trio/blue.svg';
import NoteArt from '@/assets/illustrations/onboarding/quiet-trio/note.svg';
import PainterArmArt from '@/assets/illustrations/onboarding/quiet-trio/painter-arm.svg';
import PainterArt from '@/assets/illustrations/onboarding/quiet-trio/painter.svg';
import PinkBodyArt from '@/assets/illustrations/onboarding/quiet-trio/pink-body.svg';
import PinkFrontArt from '@/assets/illustrations/onboarding/quiet-trio/pink-front.svg';
import PinkMatArt from '@/assets/illustrations/onboarding/quiet-trio/pink-mat.svg';

import { about, lerp, useSway, type Steps } from './motion';

const W = 295;
const H = 155;
const FRAME = { w: W, h: H };
// One beat, a relaxed ~100 bpm.
const BEAT = 600;

/** Start's quiet trio (295x155): the blue guy and his note sway, the pink guy sings, the painter paints. */
export function QuietTrio(_: { width?: number | string; height?: number | string }) {
  // Slow and small, more like breathing than dancing.
  const sway = useSway(BEAT * 4);
  const note = useSway(BEAT * 4, BEAT);
  const sing = useSway(BEAT * 2);
  const paint = useSway(BEAT * 2, BEAT / 2);

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Layer Art={PinkMatArt} />
      {/* Stretches up from the mat, slimming a touch as he does. */}
      <Layer
        Art={PinkBodyArt}
        transform={about(FRAME, 134, 104, [{ scaleY: lerp(sing, [1, 1.07]) }, { scaleX: lerp(sing, [1, 0.98]) }])}
      />
      <Layer Art={PinkFrontArt} />
      {/* A gentle sway from his base, lifting a touch. */}
      <Layer
        Art={BlueArt}
        transform={about(FRAME, 53, 120, [{ translateY: lerp(sway, [0, -1]) }, { rotate: lerp(sway, ['-0.8deg', '0.8deg']) }])}
      />
      <Layer Art={NoteArt} transform={about(FRAME, 86, 32, [{ translateY: lerp(note, [0, -3]) }, { rotate: lerp(note, ['-4deg', '4deg']) }])} />
      <Layer Art={PainterArt} />
      {/* The brush arm swings from the shoulder, so the brush strokes up and down the canvas. */}
      <Layer Art={PainterArmArt} transform={about(FRAME, 244, 96, [{ rotate: lerp(paint, ['6deg', '-8deg']) }])} />
    </View>
  );
}

function Layer({ Art, transform }: { Art: typeof BlueArt; transform?: Steps }) {
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
