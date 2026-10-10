import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import ConfettiArt from '@/assets/illustrations/celebrating/confetti.svg';
import EyesArt from '@/assets/illustrations/celebrating/eyes.svg';
import FaceArt from '@/assets/illustrations/celebrating/face.svg';
import HatArt from '@/assets/illustrations/celebrating/hat.svg';
import PetalsArt from '@/assets/illustrations/celebrating/petals.svg';
import WelcomeEyesArt from '@/assets/illustrations/little-guys/sun-eyes.svg';
import WelcomeFaceArt from '@/assets/illustrations/little-guys/sun-face.svg';
import WelcomePetalsArt from '@/assets/illustrations/little-guys/sun-petals.svg';

import { takeCelebration, takeSun } from './sunHandoff';
import { celebratingScene } from './sunLayout';

const native = Platform.OS !== 'web';
// Pre-login's sun is drawn tipped 8.3° anticlockwise; this one is upright.
const TILT = 8.3;

/**
 * The auth screens' celebrating sun (106x142, as the Figma export). It gently turns into its own petals,
 * closes its eyes, then gets its party hat and confetti. From Pre-login, it takes over the same sun.
 * Switching between auth forms keeps the sun settled and only pops the confetti.
 */
export function CelebratingSun(_: { width?: number; height?: number }) {
  const [from] = useState(takeSun);
  const [confettiOnly] = useState(takeCelebration);
  const anchor = useRef<View>(null);
  const v = useRef({
    shown: new Animated.Value(confettiOnly ? 1 : 0),
    move: new Animated.Value(confettiOnly ? 1 : 0),
    turn: new Animated.Value(confettiOnly ? 1 : 0),
    swap: new Animated.Value(confettiOnly ? 1 : 0),
    blink: new Animated.Value(confettiOnly ? 1 : 0),
    hat: new Animated.Value(confettiOnly ? 1 : 0),
    confetti: new Animated.Value(0),
  }).current;
  const [offset, setOffset] = useState<{ dx: number; dy: number }>();

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        if (reduce) return Object.values(v).forEach((a) => a.setValue(1));
        if (confettiOnly || !from || !anchor.current) return setOffset({ dx: 0, dy: 0 });
        anchor.current.measureInWindow((x, y) => live && setOffset({ dx: from.x - (x + 40), dy: from.y - (y + 40) }));
      });
    return () => {
      live = false;
    };
  }, [from, confettiOnly, v]);

  // Starts once the offset has rendered, so the sun never shows a frame in the wrong place.
  useEffect(() => {
    if (!offset) return;
    v.shown.setValue(1);
    const t = (a: Animated.Value, duration: number, delay: number, easing: (n: number) => number) =>
      Animated.timing(a, { toValue: 1, duration, delay, easing, useNativeDriver: native });
    const s = (a: Animated.Value, delay: number) =>
      Animated.spring(a, { toValue: 1, delay, friction: 5, tension: 80, useNativeDriver: native });
    const intro = confettiOnly ? s(v.confetti, 0) : Animated.parallel([
      t(v.move, 700, 0, Easing.inOut(Easing.quad)),
      t(v.turn, 2400, 0, Easing.inOut(Easing.quad)),
      // Petals and face swap mid-spin, while it's turning fastest.
      t(v.swap, 500, 900, Easing.inOut(Easing.quad)),
      t(v.blink, 350, 2050, Easing.in(Easing.quad)),
      s(v.hat, 2400),
      s(v.confetti, 2600),
    ]);
    intro.start();
    return () => intro.stop();
  }, [offset, confettiOnly, v]);

  const lerp = (a: Animated.Value, out: number[] | string[], input = [0, 1]) =>
    a.interpolate({ inputRange: input, outputRange: out, extrapolate: 'clamp' });
  const { dx, dy } = offset ?? { dx: 0, dy: 0 };
  const spin = { rotate: lerp(v.turn, ['0deg', '360deg']) };
  const outgoing = lerp(v.swap, [1, 0]);
  // Tips upright as it spins, over the first part of the turn.
  const tipWelcome = { rotate: lerp(v.turn, ['0deg', `${TILT}deg`], [0, 0.6]) };
  const tipCelebrating = { rotate: lerp(v.turn, [`${-TILT}deg`, '0deg'], [0, 0.6]) };

  return (
    <View style={styles.frame}>
      <View ref={anchor} collapsable={false} style={styles.sun}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: v.shown,
              transform: [{ translateX: lerp(v.move, [dx, 0]) }, { translateY: lerp(v.move, [dy, 0]) }],
            },
          ]}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: outgoing, transform: [spin] }]}>
            <WelcomePetalsArt width={80} height={80} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.swap, transform: [spin] }]}>
            <PetalsArt width={80} height={80} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: outgoing, transform: [tipWelcome] }]}>
            <WelcomeFaceArt width={80} height={80} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.swap, transform: [tipCelebrating] }]}>
            <FaceArt width={80} height={80} />
          </Animated.View>
          {/* The open eyes squash shut, then become the closed ones. */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: lerp(v.blink, [1, 0], [0.9, 1]), transform: [{ scaleY: lerp(v.blink, [1, 0.05]) }] },
            ]}>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [tipWelcome] }]}>
              <WelcomeEyesArt width={80} height={80} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: lerp(v.blink, [0, 1], [0.85, 1]) }]}>
            <EyesArt width={80} height={80} />
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: lerp(v.hat, [0, 1], [0, 0.2]), transform: [{ translateY: v.hat.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) }] },
        ]}>
        <HatArt width={106} height={142} />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: lerp(v.confetti, [0, 1], [0, 0.3]), transform: [{ scale: v.confetti }] }]}>
        <ConfettiArt width={106} height={142} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: celebratingScene.width, height: celebratingScene.height },
  // The sun's 80 box, centred on its middle at (53.94, 73.47) in the 106x142 frame.
  sun: { position: 'absolute', left: celebratingScene.sunX - 40, top: celebratingScene.sunY - 40, width: 80, height: 80 },
});
