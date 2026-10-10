import { StyleSheet, Text, View } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Pressable } from './Pressable';

type Option = { value: string; label: string };

type Props = {
  /** Group label for screen readers (the question). */
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
};

/** Radio rows in a radiogroup (Q2 378:11668, Q3 378:11902). Selected state isn't drawn; it fills with ink. */
export function RadioGroup({ label, options, value, onChange }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((o) => (
        <RadioRow key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}>
      <View style={[styles.circle, selected && styles.circleOn]}>{selected && <View style={styles.dot} />}</View>
      <Text style={[type.sub, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  circle: {
    width: 25,
    height: 25,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.ink3,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { borderColor: color.ink },
  dot: { width: 13, height: 13, borderRadius: radius.full, backgroundColor: color.ink },
  label: { flex: 1, color: color.ink },
});
