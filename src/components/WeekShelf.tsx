import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import asleepFace from '@/assets/faces/asleep.svg';
import fineFace from '@/assets/faces/fine.svg';
import spentFace from '@/assets/faces/spent.svg';
import stretchedFace from '@/assets/faces/stretched.svg';
import type { Plan } from '@/features/plans/types';
import type { Mood } from '@/lib/energy';
import { seedFrom } from '@/lib/scrap-path';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../packages/core/src';

import { Pressable } from './Pressable';
import { Scrap } from './Scrap';

// Face layers from the Your week shelf (438:3584); 46 wide, drawn from the top of a scrap.
const faces = { asleep: asleepFace, fine: fineFace, stretched: stretchedFace, spent: spentFace, bright: fineFace };
const FACE_H = { asleep: 24, fine: 30, stretched: 28, spent: 34, bright: 26 };

const STACK_W = 46;
/** Height of a full day (DAY_ROOM) between the baseline and the dotted line. */
const FULL = 154;
const GAP = 2;
const REST_H = 16;
/** How far the character (top scrap) laps over the scrap below it, like paper stuck on top. */
const OVERLAP = 6;

export type ShelfDay = {
  date: string;
  label: string;
  plans: Plan[];
  mood: Mood;
  past: boolean;
  selected: boolean;
};

/** A plan being weighed: drawn on top of its day's stack, flying in before it lands. */
export type Incoming = { date: string; plan: Plan; mood: Mood; onLanded: () => void };

type Props = {
  days: ShelfDay[];
  incoming?: Incoming;
  /** Room above the dotted line for a stack that goes over, or a block flying in. */
  headroom?: number;
  /** Names the dotted line ("Your limit"). */
  limitLabel?: string;
  /** A plan that stays its own scrap rather than merging into a same-kind character below it. */
  separate?: string;
  /** Hide the M T W row (the calendar draws its own column headings). */
  labels?: boolean;
  /** Makes the days tappable; the selected pill slides over and the chosen stack hops. */
  onSelectDay?: (date: string) => void;
};

/** Seven stacks on one baseline (34:907). Dotted line = a full day. Scrap height = energy. */
export function WeekShelf({ days, incoming, headroom = 0, limitLabel, separate, labels = true, onSelectDay }: Props) {
  const selectedIndex = Math.max(0, days.findIndex((d) => d.selected));
  const [width, setWidth] = useState(0);
  // The pill glides between days rather than jumping.
  const pillX = useRef(new Animated.Value(selectedIndex)).current;
  useEffect(() => {
    Animated.spring(pillX, { toValue: selectedIndex, friction: 8, tension: 120, useNativeDriver: false }).start();
  }, [selectedIndex, pillX]);
  const step = days.length > 1 ? (width - STACK_W) / (days.length - 1) : 0;

  // Like the tab bar, the pill can be dragged: it lifts, follows the finger along the days (each label
  // lights as it passes), and letting go picks the day under it.
  const lift = useRef(new Animated.Value(0)).current;
  const shelf = useRef<View>(null);
  const shelfLeft = useRef(0);
  const live = useRef({ days, step, selectedIndex, onSelectDay });
  live.current = { days, step, selectedIndex, onSelectDay };
  /** The day (as a fractional index) under a point along the shelf. */
  const dayAt = (fx: number) => {
    const { days: all, step: st } = live.current;
    return st ? Math.max(0, Math.min(all.length - 1, (fx - STACK_W / 2) / st)) : 0;
  };
  const drag = useRef(
    PanResponder.create({
      // Taps stay with the day columns; a sideways drag is taken from them.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !!live.current.onSelectDay && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (_, g) => {
        shelf.current?.measureInWindow((left) => (shelfLeft.current = left));
        Animated.spring(lift, { toValue: 1, friction: 6, tension: 160, useNativeDriver: false }).start();
        follow(g.moveX - shelfLeft.current);
      },
      onPanResponderMove: (_, g) => follow(g.moveX - shelfLeft.current),
      // Where the finger last was: the release itself doesn't always carry a position on the web.
      onPanResponderRelease: () => land(Math.round(last.current)),
      onPanResponderTerminate: () => land(null),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  const last = useRef(0);
  function follow(fx: number) {
    last.current = dayAt(fx);
    pillX.stopAnimation();
    Animated.spring(pillX, { toValue: last.current, friction: 12, tension: 400, useNativeDriver: false }).start();
  }
  function land(i: number | null) {
    Animated.spring(lift, { toValue: 0, friction: 7, tension: 120, useNativeDriver: false }).start();
    const { days: all, selectedIndex: at, onSelectDay: select } = live.current;
    if (i !== null && i !== at && all[i]) select?.(all[i].date);
    // Picking a new day springs the pill there (the effect above); otherwise it settles back.
    else Animated.spring(pillX, { toValue: at, friction: 8, tension: 120, useNativeDriver: false }).start();
  }

  return (
    <View
      ref={shelf}
      style={[styles.shelf, !labels && styles.shelfBare, { marginTop: headroom }]}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        shelf.current?.measureInWindow((left) => (shelfLeft.current = left));
      }}
      {...(onSelectDay && labels ? drag.panHandlers : {})}
      accessibilityRole={onSelectDay ? undefined : 'image'}
      accessibilityLabel={onSelectDay ? undefined : describe(days)}>
      {labels && (
        <Svg style={styles.fullLine} width="100%" height={2}>
          <Line x1={1} y1={1} x2="100%" y2={1} stroke={color.ink3} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 5" />
        </Svg>
      )}
      {limitLabel && <Text style={[type.foot, styles.limitLabel]}>{limitLabel}</Text>}
      <View style={styles.stacks}>
        {days.map((day) => (
          <Stack key={day.date} day={day} incoming={incoming?.date === day.date ? incoming : undefined} separate={separate} />
        ))}
      </View>
      {labels && (
        <View style={styles.labels}>
          {width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.selectedPill,
                {
                  transform: [
                    { translateX: pillX.interpolate({ inputRange: [0, Math.max(1, days.length - 1)], outputRange: [0, step * Math.max(1, days.length - 1)] }) },
                    // Lifted while dragged, like the tab bar's.
                    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                  ],
                },
              ]}
            />
          )}
          {days.map((day, i) => (
            <View key={day.date} style={styles.labelCell}>
              {/* Turns white as the pill passes under it, so the label never fights the pill mid-slide. */}
              <Animated.Text
                style={[
                  styles.label,
                  day.selected && styles.selectedLabel,
                  { color: pillX.interpolate({ inputRange: [i - 0.5, i, i + 0.5], outputRange: [color.ink2, color.selInk, color.ink2], extrapolate: 'clamp' }) },
                ]}>
                {day.label}
              </Animated.Text>
            </View>
          ))}
        </View>
      )}
      {/* Tap targets: a full-height column per day, over the stack and its label. */}
      {onSelectDay && (
        <View style={styles.taps}>
          {days.map((day) => (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${describeDay(day)}${day.selected ? ', selected' : ''}`}
              onPress={() => onSelectDay(day.date)}
              style={styles.tap}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Stack({ day, incoming, separate }: { day: ShelfDay; incoming?: Incoming; separate?: string }) {
  // A little hop when the day is picked.
  const hop = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!day.selected) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.spring(hop, { toValue: 0, friction: 5, tension: 180, useNativeDriver: false }),
    ]).start();
  }, [day.selected, hop]);
  const rest = day.plans.filter((p) => p.kind === 'rest');
  const blocks = withCharacter(day.plans.filter((p) => p.kind !== 'rest'), separate);
  const Face = faces[day.mood];
  const faceH = FACE_H[day.mood];
  return (
    <Animated.View
      style={[
        styles.stack,
        { transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { scaleY: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
      ]}>
      {/* Bottom-up by plan: column-reverse puts the first plan on the baseline. */}
      {blocks.map((p, i) => {
        // An incoming block is the top already, so nothing below it changes when it lands.
        const isTop = i === blocks.length - 1 && !incoming;
        // The character grows by OVERLAP and its bottom is tucked over the scrap below, so the stack keeps its height.
        const lapsOver = isTop && blocks.length > 1;
        const visible = Math.max((p.energyCost / DAY_ROOM) * FULL - GAP, 10);
        const h = visible + (lapsOver ? OVERLAP + GAP : 0);
        return (
          <View key={p.id} style={[{ marginTop: GAP }, lapsOver && styles.lapsOver]}>
            <Scrap cut={p.kind} past={day.past} width={STACK_W} height={h} seed={seedFrom(p.id)} />
            {isTop && (
              // A short top scrap shrinks the face so it never crosses into the gap below.
              <FaceLayer Face={Face} scale={Math.min(1, (visible - 2) / faceH)} height={faceH} />
            )}
          </View>
        );
      })}
      {incoming && (
        <IncomingBlock plan={incoming.plan} mood={incoming.mood} past={day.past} lapsOver={blocks.length > 0} onLanded={incoming.onLanded} />
      )}
      {/* Rest is a cushion drawn in front of the stack's base. */}
      {rest.length > 0 && (
        <View style={styles.cushion}>
          <Scrap cut="rest" width={STACK_W + 4} height={REST_H} seed={seedFrom(rest[0].id)} />
        </View>
      )}
    </Animated.View>
  );
}

const HOVER = 56;
const FROM_SIDE = 190;

/**
 * The new plan as a little scrap. It sweeps in from the right on an arc, tilted and turning
 * upright as it slows, hangs above its day for a beat with motion marks, then drops onto the
 * stack, gives one soft squash and settles (onLanded hands it to the stack).
 */
type IncomingProps = { plan: Plan; mood: Mood; past: boolean; lapsOver: boolean; onLanded: () => void };

function IncomingBlock({ plan, mood, past, lapsOver, onLanded }: IncomingProps) {
  // fly: 0 = off to the right, 1 = hanging above the day. drop: 0 = hanging, 1 = on the stack.
  const fly = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;
  const marks = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    let cancelled = false;
    const finish = () => !cancelled && landed.current();
    const t = (value: Animated.Value, toValue: number, duration: number, easing: (n: number) => number) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: false });
    AccessibilityInfo.isReduceMotionEnabled?.()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) return finish();
        Animated.sequence([
          // Sweep in and ease to a stop (an expo-style ease-out reads as "thrown, then caught").
          Animated.parallel([
            t(fly, 1, 720, Easing.bezier(0.16, 1, 0.3, 1)),
            Animated.sequence([Animated.delay(380), t(marks, 1, 200, Easing.out(Easing.quad))]),
          ]),
          Animated.delay(220),
          // Let go: marks fade, it falls with gravity.
          Animated.parallel([t(marks, 0, 140, Easing.in(Easing.quad)), t(drop, 1, 340, Easing.in(Easing.cubic))]),
          // One soft squash, one gentle bounce back.
          t(squash, 0.88, 90, Easing.out(Easing.quad)),
          Animated.spring(squash, { toValue: 1, friction: 6, tension: 150, useNativeDriver: false }),
        ]).start(finish);
      });
    return () => {
      cancelled = true;
    };
  }, [fly, drop, marks, squash]);

  const translateX = fly.interpolate({ inputRange: [0, 1], outputRange: [FROM_SIDE, 0] });
  // An arc: a little lift mid-flight, then settling at hover height; the drop adds the fall.
  const flyY = fly.interpolate({ inputRange: [0, 0.45, 1], outputRange: [-HOVER - 10, -HOVER - 30, -HOVER] });
  const translateY = Animated.add(flyY, drop.interpolate({ inputRange: [0, 1], outputRange: [0, HOVER] }));
  // Leans into the flight, overshoots upright a touch, then straightens.
  const rotate = fly.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['22deg', '-5deg', '0deg'] });

  // Sized and placed exactly as it will be once it's part of the stack (see Stack).
  const visible = Math.max((plan.energyCost / DAY_ROOM) * FULL - GAP, 10);
  const h = visible + (lapsOver ? OVERLAP + GAP : 0);
  const scale = Math.min(1, (visible - 2) / FACE_H[mood]);
  return (
    <Animated.View
      style={{
        marginTop: GAP,
        ...(lapsOver && { marginBottom: -(OVERLAP + GAP) }),
        zIndex: 2,
        transformOrigin: 'bottom',
        transform: [
          { translateX },
          { translateY },
          { rotate },
          { scaleY: squash },
          { scaleX: squash.interpolate({ inputRange: [0.88, 1], outputRange: [1.08, 1] }) },
        ],
      }}>
      <Scrap cut={plan.kind} past={past} width={STACK_W} height={h} seed={seedFrom(plan.id)} />
      <FaceLayer Face={faces[mood]} scale={scale} height={FACE_H[mood]} />
      {/* Motion marks, either side, while it hangs there. */}
      <Animated.View pointerEvents="none" style={[styles.marks, { opacity: marks }]}>
        <Svg width={STACK_W + 28} height={24}>
          <Path d="M8 2 Q2 12 8 22 M14 5 Q10 12 14 19" stroke={color.creatureInk} strokeWidth={1.6} strokeLinecap="round" fill="none" />
          <Path
            d={`M${STACK_W + 20} 2 Q${STACK_W + 26} 12 ${STACK_W + 20} 22 M${STACK_W + 14} 5 Q${STACK_W + 18} 12 ${STACK_W + 14} 19`}
            stroke={color.creatureInk}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** The day's character (top scrap) takes in the plans of its own kind right under it, as one tall scrap. */
function withCharacter(blocks: Plan[], separate?: string): Plan[] {
  const top = blocks[blocks.length - 1];
  if (!top || top.id === separate) return blocks;
  let i = blocks.length - 1;
  while (i > 0 && blocks[i - 1].kind === top.kind) i--;
  if (i === blocks.length - 1) return blocks;
  const merged = blocks.slice(i);
  const energyCost = merged.reduce((sum, p) => sum + p.energyCost, 0) + (merged.length - 1) * ((GAP / FULL) * DAY_ROOM);
  return [...blocks.slice(0, i), { ...top, energyCost }];
}

function FaceLayer({ Face, scale, height }: { Face: (typeof faces)['fine']; scale: number; height: number }) {
  const w = STACK_W * scale;
  return (
    <View style={[styles.face, { left: (STACK_W - w) / 2 }]}>
      <Face width={w} height={height * scale} color={color.creatureInk} />
    </View>
  );
}

const describeDay = (d: ShelfDay) => `${d.label}: ${d.plans.filter((p) => p.kind !== 'rest').length} plans, ${d.mood}`;
const describe = (days: ShelfDay[]) => days.map(describeDay).join('. ');

const styles = StyleSheet.create({
  shelf: {
    height: 193,
    width: '100%',
  },
  shelfBare: { height: FULL + 4 },
  fullLine: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  limitLabel: {
    position: 'absolute',
    top: -22,
    left: 0,
    color: color.ink2,
  },
  marks: {
    position: 'absolute',
    top: 4,
    left: -14,
  },
  stacks: {
    position: 'absolute',
    top: 1,
    left: 0,
    right: 0,
    height: FULL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stack: {
    width: STACK_W,
    flexDirection: 'column-reverse',
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  taps: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' },
  tap: { width: STACK_W, height: '100%' },
  lapsOver: {
    marginBottom: -(OVERLAP + GAP),
    zIndex: 1,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cushion: {
    position: 'absolute',
    bottom: -2,
    left: -2,
  },
  labels: {
    position: 'absolute',
    top: 171,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelCell: {
    width: STACK_W,
    alignItems: 'center',
  },
  label: {
    ...type.foot,
    color: color.ink2,
  },
  selectedPill: {
    position: 'absolute',
    top: -2,
    left: 0,
    width: STACK_W,
    height: 22,
    backgroundColor: color.accent,
    borderRadius: radius.full,
  },
  selectedLabel: {
    ...type.label,
    color: color.selInk,
  },
});
