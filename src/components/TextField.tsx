import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { focusRing } from '@/styles/focus';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Tooltip } from './Tooltip';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  /** Password fields get the show/hide eye toggle. */
  password?: boolean;
  /** Red outline: empty when it's required, or not meeting its rule. */
  invalid?: boolean;
  /** Validation hint floating directly below this field. */
  error?: string;
  /** Bump to shake the field once. */
  shake?: number;
};

/** Label + paper-2 input (DESIGN.md §3). Spec from the auth screens; verify when building them. */
export function TextField({ label, password = false, invalid = false, error, shake = 0, onFocus, onBlur, ...props }: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shake) return;
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live || reduce) return;
        const to = (toValue: number) => Animated.timing(x, { toValue, duration: 50, useNativeDriver: Platform.OS !== 'web' });
        animation = Animated.sequence([to(-6), to(6), to(-5), to(5), to(-2), to(0)]);
        animation.start();
      });
    return () => {
      live = false;
      animation?.stop();
      x.setValue(0);
    };
  }, [shake, x]);
  return (
    <View style={[styles.field, invalid && !!error && styles.withTooltip]}>
      <Text style={[type.label, styles.label]}>{label}</Text>
      <Animated.View
        style={[styles.input, invalid && styles.invalid, focused && focusRing, focused && invalid && styles.invalidFocus, { transform: [{ translateX: x }] }]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={invalid && error ? error : props.accessibilityHint}
          aria-invalid={invalid}
          secureTextEntry={password && hidden}
          placeholderTextColor={color.ink2}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[type.sub, styles.text]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}>
            <Icon name={hidden ? 'show' : 'hide'} size={22} color={color.ink2} />
          </Pressable>
        )}
      </Animated.View>
      <Tooltip text={error ?? ''} visible={invalid && !!error} placement="below" />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  // Lift the whole field above its siblings so the floating hint isn't painted behind the next input.
  withTooltip: { zIndex: 1 },
  label: { color: color.ink },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  // An outline, so turning red doesn't nudge the layout.
  invalid: { outlineColor: color.error, outlineStyle: 'solid', outlineWidth: 1.5, outlineOffset: 0 },
  invalidFocus: { outlineColor: color.error },
  text: {
    flex: 1,
    padding: 0,
    color: color.ink,
    outlineWidth: 0,
  },
});
