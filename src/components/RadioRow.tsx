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

/** Radio rows in a radiogroup (Q2 378:11668, Q3 378:11902). Selected state isn't drawn; like Q1's answer cards, it fills with ink. */
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
      style={[styles.row, selected && styles.rowOn]}>
      <Text style={[type.sub, styles.label, selected && styles.labelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: {
    // As tall as the drawn row, which had a 25px radio circle in it.
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  rowOn: { backgroundColor: color.selBg },
  label: { flex: 1, color: color.ink },
  labelOn: { color: color.selInk },
});
