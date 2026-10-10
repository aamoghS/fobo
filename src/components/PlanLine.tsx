import { StyleSheet, Text, View } from 'react-native';

import type { Plan } from '@/features/plans/types';
import { energyDrops } from '@/lib/energy';
import { timeRange } from '@/lib/format';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { EnergyDrops } from './EnergyDrops';
import { Icon } from './Icon';
import { MiniScrap } from './MiniScrap';
import { Pressable } from './Pressable';

/** A plan in a day's list: its mini scrap, title and time, energy, and a way in. */
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
        <Text style={[type.sub, styles.muted]}>{timeRange(plan.start, plan.end)}</Text>
      </View>
      {plan.kind !== 'rest' && <EnergyDrops count={energyDrops(plan.energyCost)} />}
      <Icon name="chevron" size={18} color={color.ink2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, paddingHorizontal: space[16], gap: space[12], flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  text: { flex: 1, gap: 2 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
});
