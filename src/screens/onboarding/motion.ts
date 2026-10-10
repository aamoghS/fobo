import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';

/** Runs `make()` on a loop once mounted. Under Reduce Motion it holds still at `rest`. */
function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, delay: number, rest = 0) {
  const v = useRef(new Animated.Value(0)).current;
  const build = useRef(make).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        if (reduce) return v.setValue(rest);
        loop = Animated.loop(build(v));
        if (delay) setTimeout(() => live && loop?.start(), delay);
        else loop.start();
      });
    return () => {
      live = false;
      loop?.stop();
    };
  }, [v, build, delay, rest]);
  return v;
}

/** 0 → 1 → 0 forever, eased, `period` ms per round trip. */
export function useSway(period: number, delay = 0) {
  return useLoop((v) => {
    const half = (toValue: number) =>
      Animated.timing(v, { toValue, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native });
    return Animated.sequence([half(1), half(0)]);
  }, delay);
}

/** 0 → 1 at a steady pace, then starts over. For things that drift and reset, like Z's. Holds at `rest` under Reduce Motion. */
export function useCycle(period: number, { delay = 0, rest = 0 } = {}) {
  return useLoop(
    (v) => Animated.timing(v, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: native }),
    delay,
    rest,
  );
}

export type Steps = Extract<NonNullable<Animated.WithAnimatedValue<ViewStyle>['transform']>, readonly unknown[]>;

/** Transforms that pivot on (x, y) in a w x h frame instead of its centre. */
export function about(frame: { w: number; h: number }, x: number, y: number, t: Steps): Steps {
  const dx = x - frame.w / 2;
  const dy = y - frame.h / 2;
  return [{ translateX: dx }, { translateY: dy }, ...t, { translateX: -dx }, { translateY: -dy }];
}

export const lerp = (v: Animated.Value, out: number[] | string[], input = [0, 1]) =>
  v.interpolate({ inputRange: input, outputRange: out, extrapolate: 'clamp' });
