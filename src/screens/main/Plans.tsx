import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { PlanRow } from '@/components/PlanRow';
import { useLiveScreen } from '@/data/live';
import { week } from '@/data/week';
import { weekRange } from '@/lib/format';
import { PLAN_FILTERS, plansThisWeek, upcoming, type PlanFilter } from '@/lib/week';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Plans (442:2461 shows the Social filter). */
export function Plans() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PlanFilter>('social');
  const list = upcoming(filter);
  const socialCount = plansThisWeek('social').length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 40) }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[type.pageTitle, styles.ink]}>
            Plans
          </Text>
          <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
        </View>
        <IconButton icon="plus" label="Add plan" size={46} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {PLAN_FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} pressed={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>

      {/* Only the Social summary is designed so far. */}
      {filter === 'social' && (
        <View style={styles.summaryWrap}>
          <View style={styles.summary}>
            <Image
              source={require('@/assets/illustrations/social-summary.png')}
              style={styles.characters}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
            <Text style={[type.statCard, styles.ink]}>{`${socialCount} social plans`}</Text>
            <Text style={[type.body, styles.muted]}>This week</Text>
          </View>
        </View>
      )}

      <View style={styles.upcoming}>
        <View style={styles.listHeading}>
          <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
            Upcoming
          </Text>
          <Text style={[type.foot, styles.muted]}>Energy</Text>
        </View>
        <View>
          {list.map((p, i) => (
            <PlanRow
              key={p.id}
              plan={p}
              last={i === list.length - 1}
              onPress={() => router.push({ pathname: '/plans/[id]', params: { id: p.id } })}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingBottom: 120 },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heading: { gap: 2 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  filters: { paddingLeft: 19, paddingRight: 20, paddingTop: 23, paddingBottom: 15, gap: 6 },
  summaryWrap: { paddingHorizontal: 20 },
  summary: {
    height: 124,
    paddingLeft: 20,
    paddingTop: 31,
    gap: 1,
    borderRadius: radius.lg,
    backgroundColor: color.tintPeach,
    overflow: 'hidden',
  },
  characters: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 147,
    height: 124,
  },
  upcoming: { paddingTop: 24, paddingHorizontal: 20, gap: 11 },
  listHeading: { height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
