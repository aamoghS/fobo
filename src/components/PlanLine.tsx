import { StyleSheet, Text, View } from 'react-native';

import type { Plan, PlanKind } from '@/features/plans/types';
import { energyDrops } from '@/lib/energy';
import { timeRange } from '@/lib/format';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { EnergyDrops } from './EnergyDrops';
import { MiniScrap } from './MiniScrap';
import { Pressable } from './Pressable';

/** How a plan's kind reads in a row ("Social · 7–9:30pm"). */
export const KIND_LABEL: Record<PlanKind, string> = {
  work: 'Work',
  social: 'Social',
  obligation: 'Obligation',
  enjoy: 'Personal',
  rest: 'Rest',
};

/** A plan in a day's list, straight on the page: its mini scrap, title, kind and time, and energy. */
export function PlanLine({ plan, first = false, onPress }: { plan: Plan; first?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${timeRange(plan.start, plan.end)}`}
      onPress={onPress}
      style={[styles.row, !first && styles.rule]}>
      <MiniScrap kind={plan.kind} id={plan.id} />
      <View style={styles.text}>
        <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
          {plan.title}
        </Text>
        <Text style={[type.sub, styles.muted]} numberOfLines={1}>{`${KIND_LABEL[plan.kind]} · ${timeRange(plan.start, plan.end)}`}</Text>
      </View>
      {plan.kind !== 'rest' && <EnergyDrops count={energyDrops(plan.energyCost)} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, gap: space[12], flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  text: { flex: 1, gap: 2 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
});
