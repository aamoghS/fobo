import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { focusRing } from '@/styles/focus';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon } from './Icon';
import { Pressable } from './Pressable';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  /** Password fields get the show/hide eye toggle. */
  password?: boolean;
};

/** Label + paper-2 input (DESIGN.md §3). Spec from the auth screens; verify when building them. */
export function TextField({ label, password = false, onFocus, onBlur, ...props }: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[type.label, styles.label]}>{label}</Text>
      <View style={[styles.input, focused && focusRing]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
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
  text: {
    flex: 1,
    padding: 0,
    color: color.ink,
    outlineWidth: 0,
  },
});
