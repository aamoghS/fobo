import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

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

/** Seven stacks on one baseline (34:907). Dotted line = a full day. Scrap height = energy. */
export function WeekShelf({ days }: { days: ShelfDay[] }) {
  return (
    <View style={styles.shelf} accessibilityRole="image" accessibilityLabel={describe(days)}>
      <Svg style={styles.fullLine} width="100%" height={2}>
        <Line x1={1} y1={1} x2="100%" y2={1} stroke={color.ink3} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 5" />
      </Svg>
      <View style={styles.stacks}>
        {days.map((day) => (
          <Stack key={day.date} day={day} />
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

function Stack({ day }: { day: ShelfDay }) {
  const rest = day.plans.filter((p) => p.kind === 'rest');
  const blocks = withCharacter(day.plans.filter((p) => p.kind !== 'rest'));
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
      {/* Rest is a cushion drawn in front of the stack's base. */}
      {rest.length > 0 && (
        <View style={styles.cushion}>
          <Scrap cut="rest" width={STACK_W + 4} height={REST_H} seed={seedFrom(rest[0].id)} />
        </View>
      )}
    </View>
  );
}

/** The day's character (top scrap) takes in the plans of its own kind right under it, as one tall scrap. */
function withCharacter(blocks: Plan[]): Plan[] {
  const top = blocks[blocks.length - 1];
  if (!top) return blocks;
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
