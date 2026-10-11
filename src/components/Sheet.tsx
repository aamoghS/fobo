import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Pressable } from './Pressable';

const DURATION = 320;
const NATIVE = Platform.OS !== 'web';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * A small drawer over the current screen, for picking something without leaving it (a day, a kind).
 * Looks like BottomSheet, which is for whole routes; this one keeps the screen's state.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const shown = useRef(new Animated.Value(0)).current;
  // Stays mounted while it slides away.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    let live = true;
    if (visible) setMounted(true);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        Animated.timing(shown, {
          toValue: visible ? 1 : 0,
          duration: reduce ? 0 : visible ? DURATION : DURATION - 80,
          easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          useNativeDriver: NATIVE,
        }).start(() => live && !visible && setMounted(false));
      });
    return () => {
      live = false;
    };
  }, [visible, shown]);

  // Gone entirely once closed: a hidden Modal on the web still holds focus and eats the next tap.
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: Animated.multiply(shown, 0.4) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            // Same 40 from the bottom as the screens' buttons.
            { paddingBottom: Math.max(insets.bottom, 40) },
            { transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
          ]}>
          <View style={styles.grabber} />
          <Text accessibilityRole="header" style={[type.title, styles.title]}>
            {title}
          </Text>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.ink },
  sheet: {
    width: '100%',
    // The app's column, on wide screens.
    maxWidth: 430,
    paddingHorizontal: space.margin,
    gap: space[16],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.ground,
    boxShadow: shadow.lift,
  },
  grabber: { alignSelf: 'center', marginTop: space[8], width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.rule },
  title: { color: color.ink },
});
