import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, space } from '@/styles/tokens';

import { Pressable } from './Pressable';

type Props = {
  /** Gets `close`, which slides the sheet away, then goes back (or on to `to`). */
  children: (close: (to?: Href) => void) => ReactNode;
  /** Share of the window the sheet covers. */
  height?: number;
};

const DURATION = 360;
/** Dimmed space left above the sheet, below the status bar, so there's somewhere to tap out. */
const TAP_OUT = 56;
/** Dragged down this far (or flicked), the sheet closes; less, it springs back. */
const DISMISS = 120;
// The web has no native animated module; it runs the JS driver either way.
const NATIVE = Platform.OS !== 'web';

/**
 * A route presented as a drawer: slides up over the screen beneath (the route is a
 * transparentModal in the root Stack). Tapping the dimmed backdrop or dragging the sheet down closes it.
 */
export function BottomSheet({ children, height = 0.92 }: Props) {
  'use no memo'; // The drag handlers read refs set during render.
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const sheetH = Math.round(Math.min(window.height * height, window.height - insets.top - TAP_OUT));
  // 0 = off screen below, 1 = in place.
  const shown = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(shown, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [shown]);

  const close = useCallback((to?: Href) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(shown, { toValue: 0, duration: DURATION - 80, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE }).start(() => {
      if (to) router.dismissTo(to);
      else if (router.canGoBack()) router.back();
      else router.replace('/week');
    });
  }, [router, shown]);

  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] });

  // Dragging down: the sheet follows the finger (on a wrapper, since `shown` runs on the native driver).
  const dragY = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(close);
  closeRef.current = close;
  const drag = useRef(
    PanResponder.create({
      // Bubble phase: a ScrollView or button inside gets first say, so lists still scroll and taps still land.
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS || g.vy > 0.8) closeRef.current();
        else Animated.spring(dragY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: false }).start(),
    }),
  ).current;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: Animated.multiply(shown, 0.4) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => close()} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: dragY }] }} {...drag.panHandlers}>
        <Animated.View style={[styles.sheet, { height: sheetH, paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
          {/* The grabber's strip is a bigger target for the drag than the bar itself. */}
          <View style={styles.grab}>
            <View style={styles.grabber} />
          </View>
          {children(close)}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.ink },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.ground,
    boxShadow: shadow.lift,
    overflow: 'hidden',
  },
  grab: { paddingTop: space[8], paddingBottom: space[8], alignItems: 'center' },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.rule,
  },
});
