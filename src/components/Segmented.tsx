import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Pressable } from './Pressable';

type Option<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
};

/** The capsule's inset around the pill. */
const INSET = space[4];
/** A drag starts once a finger moves this far sideways, so taps still go to the segments. */
const SLOP = 6;
// About when the sliding pill reaches a segment, so its label turns white over ink.
const ARRIVE = 150;

/**
 * Segmented toggle: segments in a fill capsule, as tall as a Button. One ink pill marks the chosen
 * side and slides between them; like the nav bar, you can also drag the pill across and let go.
 */
export function Segmented<T extends string>({ options, value, onChange, style }: Props<T>) {
  'use no memo'; // The gesture handlers read `live` and refs set during render.
  const n = options.length;
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const [width, setWidth] = useState(0);
  const [lit, setLit] = useState(index);
  const [over, setOver] = useState<number | null>(null);
  const x = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const reduce = useRef(false);
  const last = useRef(index);
  const capsule = useRef<View>(null);
  const capsuleLeft = useRef(0);
  const seg = (width - INSET * 2) / n;
  // Kept current for the gesture handlers, which are made once.
  const live = useRef({ seg, n, index, options, onChange });
  live.current = { seg, n, index, options, onChange };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => (reduce.current = on))
      .catch(() => {});
  }, []);

  // Glide to the chosen segment; the first placement lands without sliding.
  useEffect(() => {
    if (!width || over !== null) return;
    const to = index * seg;
    if (!placed.current || reduce.current) {
      placed.current = true;
      x.setValue(to);
      setLit(index);
      return;
    }
    Animated.spring(x, { toValue: to, friction: 9, tension: 90, useNativeDriver: false }).start();
    const t = setTimeout(() => setLit(index), ARRIVE);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  /** The segment under `fx`, a point along the capsule. */
  const segmentAt = (fx: number) => {
    const { seg: w, n: count } = live.current;
    return Math.max(0, Math.min(count - 1, Math.floor((fx - INSET) / w)));
  };

  function follow(fx: number) {
    const { seg: w, n: count } = live.current;
    x.stopAnimation();
    const to = Math.max(0, Math.min((count - 1) * w, fx - INSET - w / 2));
    Animated.spring(x, { toValue: to, friction: 12, tension: 400, useNativeDriver: false }).start();
    last.current = segmentAt(fx);
    setOver(last.current);
  }

  function land(i: number | null) {
    const { seg: w, index: on, options: all, onChange: change } = live.current;
    Animated.spring(lift, { toValue: 0, friction: 7, tension: 120, useNativeDriver: false }).start();
    setOver(null);
    const target = i ?? on;
    if (target !== on) {
      setLit(target);
      change(all[target].key);
    }
    Animated.spring(x, { toValue: target * w, friction: 9, tension: 90, useNativeDriver: false }).start();
  }

  const drag = useRef(
    PanResponder.create({
      // Taps belong to the segments; a sideways drag is taken from them.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > SLOP && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (_, g) => {
        capsule.current?.measureInWindow((left) => (capsuleLeft.current = left));
        Animated.spring(lift, { toValue: 1, friction: 6, tension: 160, useNativeDriver: false }).start();
        follow(g.moveX - capsuleLeft.current);
      },
      onPanResponderMove: (_, g) => follow(g.moveX - capsuleLeft.current),
      // The release's own position isn't reliable on the web; use where the pill last was.
      onPanResponderRelease: () => land(last.current),
      onPanResponderTerminate: () => land(null),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const ink = (i: number) => ((over ?? lit) === i ? color.selInk : color.ink);

  return (
    <View
      ref={capsule}
      accessibilityRole="tablist"
      style={[styles.capsule, style]}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        capsule.current?.measureInWindow((left) => (capsuleLeft.current = left));
      }}
      {...drag.panHandlers}>
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: seg,
              transform: [{ translateX: x }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
            },
          ]}
        />
      )}
      {options.map((o, i) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          onPress={() => i !== index && onChange(o.key)}
          style={styles.segment}>
          <Text style={[type.bodyStrong, { color: ink(i) }]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 54 tall, the same as a default Button.
  capsule: { height: 54, padding: INSET, flexDirection: 'row', borderRadius: radius.full, backgroundColor: color.fill },
  pill: { position: 'absolute', left: INSET, top: INSET, bottom: INSET, borderRadius: radius.full, backgroundColor: color.selBg },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
