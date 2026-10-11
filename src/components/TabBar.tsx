import type { TabTriggerSlotProps } from 'expo-router/ui';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { AccessibilityInfo, Animated, PanResponder, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

type Spot = { x: number; width: number };
type Bar = {
  /** Where each tab sits in the bar. */
  place: (label: string, spot: Spot) => void;
  /** How to switch to a tab (its own press, kept current). */
  press: (label: string, go: () => void) => void;
  focus: (label: string) => void;
  /** The tab under a finger dragging the pill, or null when not dragging. */
  over: string | null;
};
const BarContext = createContext<Bar | null>(null);

// Switching tabs from a drag goes through the tab's own press, which on the web wants a left click.
const DRAG_PRESS = {
  button: 0,
  defaultPrevented: false,
  isDefaultPrevented: () => false,
  preventDefault: () => {},
  currentTarget: { target: '' },
};

/** A drag starts once a finger moves this far sideways, so taps still go to the tabs. */
const SLOP = 6;

// iOS 26 and later draw the bar in the system's Liquid Glass; elsewhere it's frosted.
const LIQUID = isLiquidGlassAvailable();

/**
 * Floating bottom nav, after the Final screens (instance of 148:*): a 370x64 capsule with shadow-nav,
 * now glass. The page shows through it, frosted: Liquid Glass on iOS 26+, a blurred see-through white
 * on the web, and a mostly white capsule on older iOS and Android (no blur there).
 *
 * One white pill marks the tab you're on and slides between tabs. Like iOS's tab bar, you can also
 * press and drag along the bar: the pill lifts, follows your finger, lights the tab under it, and
 * letting go switches to that tab.
 */
export function TabBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [spots, setSpots] = useState<Record<string, Spot>>({});
  const [focused, setFocused] = useState<string>();
  const [over, setOver] = useState<string | null>(null);
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  // The first placement lands without sliding in from the left.
  const placed = useRef(false);
  const reduce = useRef(false);
  const presses = useRef<Record<string, () => void>>({});
  const bar = useRef<View>(null);
  const barLeft = useRef(0);
  // Kept current for the gesture handlers, which are made once.
  const live = useRef({ spots, focused });
  live.current = { spots, focused };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => (reduce.current = on))
      .catch(() => {});
  }, []);

  const glideTo = (s: Spot) => {
    if (reduce.current) {
      x.setValue(s.x);
      width.setValue(s.width);
      return;
    }
    // A soft spring: it glides over and settles with the smallest overshoot.
    const glide = { friction: 9, tension: 90, useNativeDriver: false };
    Animated.parallel([Animated.spring(x, { toValue: s.x, ...glide }), Animated.spring(width, { toValue: s.width, ...glide })]).start();
  };

  const spot = focused ? spots[focused] : undefined;
  useEffect(() => {
    if (!spot || over) return;
    if (!placed.current) {
      placed.current = true;
      x.setValue(spot.x);
      width.setValue(spot.width);
      return;
    }
    glideTo(spot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.x, spot?.width]);

  /** The tab whose span holds `fx` (a point along the bar), or the nearest end. */
  const tabAt = (fx: number) => {
    const all = Object.entries(live.current.spots).sort((a, b) => a[1].x - b[1].x);
    if (!all.length) return undefined;
    return (all.find(([, s]) => fx < s.x + s.width) ?? all[all.length - 1])[0];
  };

  const drag = useRef(
    PanResponder.create({
      // Taps belong to the tabs; a sideways drag is taken from them.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > SLOP && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (_, g) => {
        bar.current?.measureInWindow((left) => (barLeft.current = left));
        Animated.spring(lift, { toValue: 1, friction: 6, tension: 160, useNativeDriver: false }).start();
        follow(g.moveX - barLeft.current);
      },
      onPanResponderMove: (_, g) => follow(g.moveX - barLeft.current),
      onPanResponderRelease: (_, g) => land(g.moveX - barLeft.current),
      onPanResponderTerminate: () => land(null),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // The pill centres on the finger, kept inside the bar's ends.
  function follow(fx: number) {
    const { spots: all, focused: on } = live.current;
    const w = (on && all[on]?.width) || Object.values(all)[0]?.width || 0;
    const xs = Object.values(all).map((s) => s.x);
    const min = Math.min(...xs);
    const max = Math.max(...Object.values(all).map((s) => s.x + s.width)) - w;
    x.stopAnimation();
    Animated.spring(x, { toValue: Math.max(min, Math.min(max, fx - w / 2)), friction: 12, tension: 400, useNativeDriver: false }).start();
    setOver(tabAt(fx) ?? null);
  }

  // Letting go: switch to the tab under the finger (the pill then glides into it), or settle back.
  function land(fx: number | null) {
    Animated.spring(lift, { toValue: 0, friction: 7, tension: 120, useNativeDriver: false }).start();
    const target = fx === null ? undefined : tabAt(fx);
    setOver(null);
    const { spots: all, focused: on } = live.current;
    if (target && target !== on) presses.current[target]?.();
    const back = all[target ?? on ?? ''];
    if (back) glideTo(back);
  }

  const context = useMemo<Bar>(
    () => ({
      press: (label, go) => {
        presses.current[label] = go;
      },
      place: (label, s) => {
        setSpots((all) => (all[label]?.x === s.x && all[label]?.width === s.width ? all : { ...all, [label]: s }));
      },
      focus: (label) => setFocused(label),
      over,
    }),
    [over],
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 20) }]}>
      <View
        ref={bar}
        accessibilityRole="tablist"
        style={[styles.bar, !LIQUID && styles.frost]}
        onLayout={() => bar.current?.measureInWindow((left) => (barLeft.current = left))}
        {...drag.panHandlers}>
        {LIQUID && <GlassView pointerEvents="none" glassEffectStyle="regular" colorScheme="light" style={styles.glass} />}
        {spot && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                left: x,
                width,
                // Lifted while dragged: a touch bigger, like it's come off the bar.
                transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
              },
            ]}
          />
        )}
        <BarContext.Provider value={context}>{children}</BarContext.Provider>
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string; disabled?: boolean };

export function TabButton({ icon, label, isFocused, disabled, onPress, ...props }: TabButtonProps) {
  const bar = useContext(BarContext);
  useEffect(() => {
    if (isFocused) bar?.focus(label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, label]);
  useEffect(() => {
    bar?.press(label, () => onPress?.(DRAG_PRESS as never));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress, label]);
  // Ink on the glass and on the white pill alike; the pill alone marks the tab you're on. Outside a
  // TabBar the tab fills itself in ink, so it goes white.
  const ink = !bar && isFocused ? color.selInk : color.ink;
  return (
    <Pressable
      {...props}
      onPress={onPress}
      onLayout={(e) => bar?.place(label, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused, disabled }}
      aria-selected={!!isFocused}
      disabled={disabled}
      // Without the bar's sliding pill (outside a TabBar), the tab fills itself.
      style={[styles.tab, isFocused && !bar && styles.active]}>
      <Icon name={icon} color={ink} />
      {/* The tab you're on is set in bold. */}
      <Text style={[isFocused ? type.label : type.foot, { color: ink }]}>{label}</Text>
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
    boxShadow: shadow.nav,
  },
  glass: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.nav },
  // No glass token: the fill colour (#f1f1ee) at 70% over a 24px blur on the web, so the white pill
  // stands out; without a blur, nearly solid so it reads over anything.
  frost: Platform.select<ViewStyle>({
    web: { backgroundColor: 'rgba(241, 241, 238, 0.7)', backdropFilter: 'blur(24px) saturate(180%)' } as ViewStyle,
    default: { backgroundColor: 'rgba(241, 241, 238, 0.94)' },
  }),
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
  // A tab's size and place: the bar's 64px less its 1px border leaves 3.5px above and below a 55px tab.
  pill: {
    position: 'absolute',
    top: 3.5,
    height: 55,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
});
