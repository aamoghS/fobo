import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

/**
 * Floating bottom nav as drawn on the Final screens (instance of 148:*): 370x64 white pill,
 * rule border, shadow-nav. The DS Tab Bar (31:62) differs slightly; the screens win here.
 */
export function TabBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 20) }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string; disabled?: boolean };

export function TabButton({ icon, label, isFocused, disabled, ...props }: TabButtonProps) {
  const ink = isFocused ? color.selInk : color.ink;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused, disabled }}
      aria-selected={!!isFocused}
      disabled={disabled}
      style={[styles.tab, isFocused && styles.active]}>
      <Icon name={icon} color={ink} />
      <Text style={[type.foot, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bar: {
    width: '100%',
    maxWidth: 370,
    height: 64,
    paddingHorizontal: 4,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.nav,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.paper,
    boxShadow: shadow.nav,
  },
  tab: {
    flex: 1,
    height: 55,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  active: {
    backgroundColor: color.groundDeep,
  },
});
