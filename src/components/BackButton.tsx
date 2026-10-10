import { StyleSheet } from 'react-native';

import { color, radius } from '@/styles/tokens';

import { Icon } from './Icon';
import { Pressable } from './Pressable';

/** 54x54 back button used on auth and onboarding (DESIGN.md §3). */
export function BackButton({ onPress, label = 'Back' }: { onPress?: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back}>
      <Icon name="back" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 54,
    height: 54,
    borderRadius: radius.back,
    backgroundColor: color.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
