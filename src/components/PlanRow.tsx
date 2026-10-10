import { StyleSheet, Text, View } from 'react-native';

import type { Plan, PlanKind } from '@/features/plans/types';
import { energyDrops } from '@/lib/energy';
import { dateTile, timeRange } from '@/lib/format';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { EnergyDrops } from './EnergyDrops';
import { Pressable } from './Pressable';
import { scrapColor } from './Scrap';

type Props = {
  plan: Plan;
  last?: boolean;
  onPress?: () => void;
};

/** How a plan's kind reads in a row ("Social · 7–9:30pm"). */
export const KIND_LABEL: Record<PlanKind, string> = {
  work: 'Work',
  social: 'Social',
  obligation: 'Obligation',
  enjoy: 'Personal',
  rest: 'Rest',
};

/** Plan row: a date tile in the plan's kind colour, title, kind and time, energy drops, bottom rule. */
export function PlanRow({ plan, last = false, onPress }: Props) {
  const tile = dateTile(plan.start);
  const time = `${KIND_LABEL[plan.kind]} · ${timeRange(plan.start, plan.end)}` + (plan.leaveBy ? ` · Leave by ${plan.leaveBy}` : '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${tile.weekday} ${tile.day}, ${time}`}
      onPress={onPress}
      style={[styles.row, !last && styles.rule]}>
      <View style={[styles.tile, { backgroundColor: scrapColor[plan.kind] }]}>
        <Text style={[type.foot, styles.weekday]}>{tile.weekday}</Text>
        <Text style={[type.title, styles.day]}>{tile.day}</Text>
      </View>
      <View style={styles.details}>
        <Text style={[type.bodyStrong, styles.title]}>{plan.title}</Text>
        <Text style={[type.sub, styles.time]} numberOfLines={1}>
          {time}
        </Text>
      </View>
      <EnergyDrops count={energyDrops(plan.energyCost)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 84,
    paddingVertical: space[12],
    gap: space[16],
    flexDirection: 'row',
    alignItems: 'center',
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  tile: {
    width: 52,
    height: 62,
    gap: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
  },
  weekday: { color: color.selInk, opacity: 0.85 },
  day: { color: color.selInk },
  details: { flex: 1, gap: space[4] },
  title: { color: color.ink },
  time: { color: color.ink2 },
});
