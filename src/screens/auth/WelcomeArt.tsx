import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import BlueArt from '@/assets/illustrations/little-guys/blue.svg';
import ConfettiArt from '@/assets/illustrations/little-guys/confetti.svg';
import GreenArt from '@/assets/illustrations/little-guys/green.svg';
import HourglassArt from '@/assets/illustrations/little-guys/hourglass.svg';
import RedArt from '@/assets/illustrations/little-guys/red.svg';
import SunEyesArt from '@/assets/illustrations/little-guys/sun-eyes.svg';
import SunFaceArt from '@/assets/illustrations/little-guys/sun-face.svg';
import SunPetalsArt from '@/assets/illustrations/little-guys/sun-petals.svg';
import YellowArt from '@/assets/illustrations/little-guys/yellow.svg';
import SplashFaceArt from '@/assets/illustrations/sunshine-face.svg';

import { handOffSun, takeSun } from './sunHandoff';

const native = Platform.OS !== 'web';

// The sun's resting spot, so a button can hand it on to the next screen.
let resting: View | null = null;

/** Hands the sun on (it rests in its drawn pose), then runs `next`. */
export function handOffWelcomeSun(next: () => void) {
  if (!resting) return next();
  resting.measureInWindow((x, y) => {
    handOffSun({ x: x + 80, y: y + 80, angle: 0 });
    next();
  });
}

// The scene's sun is the splash sun at half size, tilted 8.3° anticlockwise.
const TILT = -8.3;
// Each layer pops out of this point (the middle of the characters), drawn from the layer's own centre.
const FROM = { x: 162 - 365 / 2, y: 215 - 397 / 2 };

// Characters and confetti in the scene's paint order, with how long each waits before popping in.
const LAYERS = [
  { Art: BlueArt, delay: 140 },
  { Art: GreenArt, delay: 70 },
  { Art: YellowArt, delay: 70 },
  { Art: RedArt, delay: 140 },
  { Art: HourglassArt, delay: 0 },
  { Art: ConfettiArt, delay: 220, bounce: true },
];

function useReduceMotion(start: (reduce: boolean) => void) {
  const run = useRef(start);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => live && run.current(reduce));
    return () => {
      live = false;
    };
  }, []);
}

/** Fades in after the art has landed. Used for Pre-login's copy and buttons. */
export function useFadeIn(delay: number) {
  const v = useRef(new Animated.Value(0)).current;
  useReduceMotion((reduce) => {
    if (reduce) v.setValue(1);
    else Animated.timing(v, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  });
  return v;
}

/** Pre-login's little guys. They burst out of the middle and bounce into place while the sun flies in from the splash. */
export function WelcomeArt() {
  const pops = useRef(LAYERS.map(() => new Animated.Value(0))).current;
  const [from] = useState(takeSun);
  const sun = useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    turn: new Animated.Value(0),
    pop: new Animated.Value(from ? 1 : 0),
  }).current;
  const anchor = useRef<View>(null);
  const shown = useRef(new Animated.Value(from ? 0 : 1)).current;
  // How far the sun starts from where it lands, and its petal turn. Set once it's measured.
  const [plan, setPlan] = useState<{ reduce: boolean; dx: number; dy: number; r0: number; r1: number }>();

  useReduceMotion((reduce) => {
    const still = { reduce, dx: 0, dy: 0, r0: -270, r1: 0 };
    if (!from || reduce || !anchor.current) return setPlan(still);
    anchor.current.measureInWindow((x, y) => {
      // Scene petals at rotate(r) sit at the splash's angle when r = angle - TILT. Keep turning clockwise, at least half a turn, and stop on the drawn pose.
      const r0 = from.angle - TILT;
      setPlan({ reduce, dx: from.x - (x + 80), dy: from.y - (y + 80), r0, r1: Math.ceil((r0 + 180) / 360) * 360 });
    });
  });

  // Starts once the plan has rendered, so the sun never shows a frame in the wrong place.
  useEffect(() => {
    if (!plan) return;
    shown.setValue(1);
    if (plan.reduce) {
      [...pops, sun.x, sun.y, sun.turn, sun.pop].forEach((v) => v.setValue(1));
      return;
    }
    const intro = Animated.parallel([
      ...LAYERS.map(({ delay, bounce }, i) =>
        Animated.spring(pops[i], {
          toValue: 1,
          delay: 150 + delay,
          friction: bounce ? 4 : 5,
          tension: 70,
          useNativeDriver: native,
        }),
      ),
      // Up first, then over to the top right, shrinking as it goes.
      Animated.timing(sun.y, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.timing(sun.x, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      // The petals keep turning and wind down after it lands.
      Animated.timing(sun.turn, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.spring(sun.pop, { toValue: 1, delay: 150, friction: 5, tension: 70, useNativeDriver: native }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [plan, pops, sun, shown]);

  const { dx, dy, r0, r1 } = plan ?? { dx: 0, dy: 0, r0: -270, r1: 0 };
  const sunStyle = {
    opacity: shown,
    transform: [
      { translateX: sun.x.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
      { translateY: sun.y.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
      // The 160 box is splash size; the scene's sun is half that.
      { scale: from ? sun.y.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) : Animated.multiply(sun.pop, 0.5) },
    ],
  };

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      {LAYERS.map(({ Art }, i) => (
        <Animated.View key={i} style={[styles.layer, popStyle(pops[i])]}>
          <Art width={365} height={397} />
        </Animated.View>
      ))}
      <View
        ref={(v) => {
          anchor.current = v;
          resting = v;
        }}
        style={styles.sun}
        collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, sunStyle]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ rotate: sun.turn.interpolate({ inputRange: [0, 1], outputRange: [`${r0}deg`, `${r1}deg`] }) }] },
            ]}>
            <SunPetalsArt width={160} height={160} />
          </Animated.View>
          {/* The face tips from the splash's upright pose to the scene's tilt, swapping faces on the way. */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  { rotate: from ? sun.y.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${TILT}deg`] }) : `${TILT}deg` },
                ],
              },
            ]}>
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${-TILT}deg` }] }]}>
              <SunFaceArt width={160} height={160} />
              <View style={StyleSheet.absoluteFill}>
                <SunEyesArt width={160} height={160} />
              </View>
            </View>
            {from && (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: sun.y.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
                <SplashFaceArt width={160} height={160} />
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function popStyle(v: Animated.Value): Animated.WithAnimatedValue<ViewStyle> {
  return {
    opacity: v.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateX: FROM.x }, { translateY: FROM.y }, { scale: v }, { translateX: -FROM.x }, { translateY: -FROM.y }],
  };
}

const styles = StyleSheet.create({
  // 315x255 in Figma; the export is the scene's full bounds, so its origin sits up and to the left of the frame.
  frame: { width: 315, height: 255, zIndex: 1 },
  layer: { position: 'absolute', left: -10.7, top: -29.5, width: 365, height: 397 },
  // The sun's 160 box, centred on its middle at (296.27, 35.57) in the scene.
  sun: { position: 'absolute', left: 296.27 - 10.7 - 80, top: 35.57 - 29.5 - 80, width: 160, height: 160 },
});
