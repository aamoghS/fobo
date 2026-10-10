import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

/** Button set 34:965: `.btn.ink` / `.btn.quiet` / `.btn.text`. */
export type ButtonVariant = 'ink' | 'quiet' | 'text';

type Props = {
  label: string;
  variant?: ButtonVariant;
  /**
   * default: 54 tall, Body Strong (DS). compact: 52 tall, Sub Strong (Event footer).
   * small: 32 tall, Sub Strong (inline "Edit").
   */
  size?: 'default' | 'compact' | 'small';
  icon?: IconName;
  /** Ink button with a paper circle and arrow on the right ("Weigh a plan" on Your week). */
  trailingArrow?: boolean;
  disabled?: boolean;
  /** Looks disabled but still takes the tap, so a form can show what's missing. */
  dimmed?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  variant = 'ink',
  size = 'default',
  icon,
  trailingArrow = false,
  disabled = false,
  dimmed = false,
  onPress,
  style,
  accessibilityHint,
}: Props) {
  // Disabled (34:965): primary takes an ink-3 fill; quiet and text drop to ink-3 text.
  const grey = disabled || dimmed;
  const text = variant === 'ink' ? color.paper : grey ? color.ink3 : variant === 'quiet' ? color.ink : color.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === 'small' ? 6 : undefined}
      style={[
        styles.base,
        styles[size],
        variant === 'ink' && styles.ink,
        variant === 'quiet' && styles.quiet,
        variant === 'text' && styles.text,
        trailingArrow && styles.withArrow,
        grey && variant === 'ink' && styles.inkDisabled,
        style,
      ]}>
      {icon && <Icon name={icon} color={text} />}
      <Text style={[size === 'default' ? type.bodyStrong : type.subStrong, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingArrow && (
        <View style={styles.arrow}>
          <Icon name="arrow" size={20} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.full,
  },
  default: { height: 54, paddingHorizontal: 28 },
  compact: { height: 52, paddingHorizontal: 20 },
  small: { height: 32, paddingHorizontal: 14 },
  ink: { backgroundColor: color.ink },
  quiet: { backgroundColor: color.fill },
  text: { paddingHorizontal: 12 },
  withArrow: {
    height: 56,
    paddingLeft: 16,
    paddingRight: 8,
    justifyContent: 'space-between',
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inkDisabled: { backgroundColor: color.ink3 },
});
