import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, space } from '@/styles/tokens';

import { Pressable } from './Pressable';

type Props = {
  /** Gets `close`, which slides the sheet away and then goes back. */
  children: (close: () => void) => ReactNode;
  /** Share of the window the sheet covers. */
  height?: number;
};

const DURATION = 360;
// The web has no native animated module; it runs the JS driver either way.
const NATIVE = Platform.OS !== 'web';

/**
 * A route presented as a drawer: slides up over the screen beneath (the route is a
 * transparentModal in the root Stack), with a dimmed backdrop that also closes it.
 */
export function BottomSheet({ children, height = 0.92 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const sheetH = Math.round(window.height * height);
  // 0 = off screen below, 1 = in place.
  const shown = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(shown, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [shown]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(shown, { toValue: 0, duration: DURATION - 80, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE }).start(() =>
      router.canGoBack() ? router.back() : router.replace('/week'),
    );
  }, [router, shown]);

  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: Animated.multiply(shown, 0.4) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: sheetH, paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
        <View style={styles.grabber} />
        {children(close)}
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
  grabber: {
    alignSelf: 'center',
    marginTop: space[8],
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.rule,
  },
});
