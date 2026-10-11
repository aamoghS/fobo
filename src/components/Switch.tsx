import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { color, radius, shadow } from '@/styles/tokens';

import { Pressable } from './Pressable';

type Props = {
  value: boolean;
  onChange: (on: boolean) => void;
  /** What it turns on, for screen readers. */
  label: string;
  disabled?: boolean;
};

const W = 51;
const H = 31;
const KNOB = 27;

/** On/off switch: a fill capsule that goes ink when on, with a paper knob that slides across. */
export function Switch({ value, onChange, label, disabled = false }: Props) {
  const on = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(on, { toValue: value ? 1 : 0, friction: 9, tension: 140, useNativeDriver: false }).start();
  }, [value, on]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}>
      <Animated.View
        style={[
          styles.track,
          disabled && styles.disabled,
          { backgroundColor: on.interpolate({ inputRange: [0, 1], outputRange: [color.divider, color.selBg] }) },
        ]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: on.interpolate({ inputRange: [0, 1], outputRange: [0, W - KNOB - 4] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, padding: 2, borderRadius: radius.full, justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: radius.full, backgroundColor: color.paper, boxShadow: shadow.paper },
  disabled: { opacity: 0.5 },
});
