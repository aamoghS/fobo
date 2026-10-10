import { StyleSheet } from 'react-native';

import { color, radius } from '@/styles/tokens';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** 44 in the DS (34:1010). Screens use 46 (Plans) and 47 (Your week). */
  size?: number;
  iconSize?: number;
};

/** `.circ`: round fill button holding one icon. */
export function IconButton({ icon, label, onPress, size = 44, iconSize = 22 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.circ, { width: size, height: size }]}>
      <Icon name={icon} size={iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circ: {
    borderRadius: radius.full,
    backgroundColor: color.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
