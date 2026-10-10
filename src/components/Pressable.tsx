import { useState } from 'react';
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { focusRing, isKeyboardMode } from '@/styles/focus';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

/** Pressable with a visible keyboard focus ring and a light press state. */
export function Pressable({ style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <RNPressable
      {...props}
      onFocus={(e) => {
        setFocused(isKeyboardMode());
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && { opacity: 0.85 },
        focused && focusRing,
      ]}
    />
  );
}
