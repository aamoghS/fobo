import { StyleSheet, Text } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

type Props = {
  label: string;
  pressed: boolean;
  icon?: IconName;
  onPress?: () => void;
};

/** Chip set 34:1000: `.chip[aria-pressed]`. 36 tall; hitSlop brings the target to 44. */
export function Chip({ label, pressed, icon, onPress }: Props) {
  const ink = pressed ? color.selInk : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: pressed }}
      aria-pressed={pressed}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[styles.chip, pressed && styles.pressed]}>
      {icon && <Icon name={icon} size={18} color={ink} />}
      <Text style={[type.subStrong, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  pressed: {
    backgroundColor: color.selBg,
  },
});
