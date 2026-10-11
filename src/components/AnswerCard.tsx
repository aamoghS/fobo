import { useEffect, useRef, type FC } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Pressable } from './Pressable';

type Props = {
  title: string;
  caption: string;
  /** 95x104 character art. */
  Art: FC<SvgProps>;
  selected: boolean;
  onPress: () => void;
};

/**
 * Answer tile from Q1 (378:11162). Unselected as drawn; the selected state isn't drawn,
 * so it borrows the Choice Card's (34:992): ink fill, white title, ink-3 caption. Chosen, it pops
 * up a touch.
 */
export function AnswerCard({ title, caption, Art, selected, onPress }: Props) {
  const stuck = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        if (reduce) stuck.setValue(selected ? 1 : 0);
        else Animated.spring(stuck, { toValue: selected ? 1 : 0, friction: 5, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
      });
    return () => {
      live = false;
    };
  }, [selected, stuck]);
  return (
    <Animated.View
      style={[
        styles.wrap,
        selected && styles.lifted,
        {
          transform: [{ scale: stuck.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
        },
      ]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={`${title}. ${caption}`}
        onPress={onPress}
        style={[styles.card, selected && styles.selected]}>
        <View style={styles.inner}>
          <View importantForAccessibility="no-hide-descendants">
            <Art width={95} height={104} />
          </View>
          <Text style={[type.subStrong, styles.center, { color: selected ? color.selInk : color.ink }]}>{title}</Text>
          <Text style={[type.foot, styles.center, { color: selected ? color.ink3 : color.ink2 }]} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  lifted: { zIndex: 1 },
  card: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  selected: { backgroundColor: color.selBg },
  inner: { width: '100%', alignItems: 'center' },
  center: { textAlign: 'center' },
});
