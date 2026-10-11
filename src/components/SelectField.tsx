import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon } from './Icon';
import { Pressable } from './Pressable';

type Props = {
  label: string;
  value: string;
  /** Drawn before the value, like a kind's scrap. */
  leading?: ReactNode;
  onPress: () => void;
};

/** A TextField-shaped dropdown: label, then the chosen value and a down chevron. Opens a Sheet to pick. */
export function SelectField({ label, value, leading, onPress }: Props) {
  return (
    <View style={styles.field}>
      <Text style={[type.label, styles.ink]}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityHint="Opens a list to choose from" onPress={onPress} style={styles.input}>
        {leading}
        <Text style={[type.sub, styles.ink, styles.value]} numberOfLines={1}>
          {value}
        </Text>
        <View style={styles.down}>
          <Icon name="chevron" size={18} color={color.ink2} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 8 },
  ink: { color: color.ink },
  // Matches TextField's input.
  input: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  value: { flex: 1 },
  down: { transform: [{ rotate: '90deg' }] },
});
