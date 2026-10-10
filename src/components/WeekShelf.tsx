import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
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
export type Incoming = { date: string; plan: Plan; onLanded: () => void };

type Props = {
  days: ShelfDay[];
  incoming?: Incoming;
  /** Room above the dotted line for a stack that goes over, or a block flying in. */
  headroom?: number;
  /** Names the dotted line ("Your limit"). */
  limitLabel?: string;
  /** A plan that stays its own scrap rather than merging into a same-kind character below it. */
  separate?: string;
};

/** Seven stacks on one baseline (34:907). Dotted line = a full day. Scrap height = energy. */
export function WeekShelf({ days, incoming, headroom = 0, limitLabel, separate }: Props) {
  return (
    <View style={[styles.shelf, { marginTop: headroom }]} accessibilityRole="image" accessibilityLabel={describe(days)}>
      <Svg style={styles.fullLine} width="100%" height={2}>
        <Line x1={1} y1={1} x2="100%" y2={1} stroke={color.ink3} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 5" />
      </Svg>
      {limitLabel && <Text style={[type.foot, styles.limitLabel]}>{limitLabel}</Text>}
      <View style={styles.stacks}>
        {days.map((day) => (
          <Stack key={day.date} day={day} incoming={incoming?.date === day.date ? incoming : undefined} separate={separate} />
        ))}
      </View>
      <View style={styles.labels}>
        {days.map((day) => (
          <View key={day.date} style={styles.labelCell}>
            {day.selected ? (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedLabel}>{day.label}</Text>
              </View>
            ) : (
              <Text style={styles.label}>{day.label}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Stack({ day, incoming, separate }: { day: ShelfDay; incoming?: Incoming; separate?: string }) {
  const rest = day.plans.filter((p) => p.kind === 'rest');
  const blocks = withCharacter(day.plans.filter((p) => p.kind !== 'rest'), separate);
  const Face = faces[day.mood];
  const faceH = FACE_H[day.mood];
  return (
    <View style={styles.stack}>
      {/* Bottom-up by plan: column-reverse puts the first plan on the baseline. */}
      {blocks.map((p, i) => {
        const isTop = i === blocks.length - 1;
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
      {incoming && <IncomingBlock plan={incoming.plan} past={day.past} onLanded={incoming.onLanded} />}
      {/* Rest is a cushion drawn in front of the stack's base. */}
      {rest.length > 0 && (
        <View style={styles.cushion}>
          <Scrap cut="rest" width={STACK_W + 4} height={REST_H} seed={seedFrom(rest[0].id)} />
        </View>
      )}
    </View>
  );
}

const HOVER = 56;
const FROM_SIDE = 190;

/**
 * The new plan as a little scrap. It sweeps in from the right on an arc, tilted and turning
 * upright as it slows, hangs above its day for a beat with motion marks, then drops onto the
 * stack, gives one soft squash and settles (onLanded hands it to the stack).
 */
function IncomingBlock({ plan, past, onLanded }: { plan: Plan; past: boolean; onLanded: () => void }) {
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

  const visible = Math.max((plan.energyCost / DAY_ROOM) * FULL - GAP, 10);
  const scale = Math.min(1, (visible - 2) / FACE_H.spent);
  return (
    <Animated.View
      style={{
        marginTop: GAP,
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
      <Scrap cut={plan.kind} past={past} width={STACK_W} height={visible} seed={seedFrom(plan.id)} />
      <FaceLayer Face={faces.spent} scale={scale} height={FACE_H.spent} />
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

function describe(days: ShelfDay[]) {
  return days
    .map((d) => `${d.label}: ${d.plans.filter((p) => p.kind !== 'rest').length} plans, ${d.mood}`)
    .join('. ');
}

const styles = StyleSheet.create({
  shelf: {
    height: 193,
    width: '100%',
  },
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
  },
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
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingHorizontal: 12,
  },
  selectedLabel: {
    ...type.label,
    color: color.selInk,
  },
});
