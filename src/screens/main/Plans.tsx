import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { NavFade } from '@/components/NavFade';
import { PlanRow } from '@/components/PlanRow';
import { useLiveScreen } from '@/data/live';
import { week } from '@/data/week';
import { weekRange } from '@/lib/format';
import { PLAN_FILTERS, plansThisWeek, upcoming, type PlanFilter } from '@/lib/week';
import AllArt from '@/assets/illustrations/all-summary.svg';
import ObligationArt from '@/assets/illustrations/obligation-summary.svg';
import PersonalArt from '@/assets/illustrations/personal-summary.svg';
import SocialArt from '@/assets/illustrations/social-summary.svg';
import WorkArt from '@/assets/illustrations/work-summary.svg';
import { withAlpha } from '@/styles/alpha';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

type Summary = {
  count: (n: number) => string;
  /** Figma fills each card with a scrap colour at 15%. */
  tint: string;
  art: ReactNode;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One summary card per filter, tinted as the Final frames draw them: Plans · All (482:1824), Work (468:1125), Social (442:2461), Obligations (479:1692), Personal (478:1267). */
const SUMMARIES: Record<PlanFilter, Summary> = {
  all: {
    count: (n) => plural(n, 'plan overall', 'plans overall'),
    tint: withAlpha(color.scrapWork, 0.15),
    art: <AllArt width={150} height={140} style={{ position: 'absolute', top: 0, right: 5 }} />,
  },
  work: {
    count: (n) => plural(n, 'work plan', 'work plans'),
    tint: withAlpha(color.scrapObligation, 0.15),
    art: <WorkArt width={79} height={93} style={{ position: 'absolute', top: 31, right: 35 }} />,
  },
  social: {
    count: (n) => plural(n, 'social plan', 'social plans'),
    tint: color.tintPeach,
    art: <SocialArt width={147} height={124} style={{ position: 'absolute', top: 0, right: 0 }} />,
  },
  obligation: {
    count: (n) => plural(n, 'obligation', 'obligations'),
    // Figma uses a sage (#76AB93) with no token; the enjoy green is the nearest one.
    tint: withAlpha(color.scrapEnjoy, 0.15),
    art: <ObligationArt width={160} height={124} style={{ position: 'absolute', top: 0, right: 0 }} />,
  },
  personal: {
    count: (n) => plural(n, 'personal plan', 'personal plans'),
    tint: withAlpha(color.scrapRest, 0.15),
    art: <PersonalArt width={150} height={140} style={{ position: 'absolute', top: 4, right: -9 }} />,
  },
};

/** Plans, with a summary card for the selected filter. */
export function Plans() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PlanFilter>('social');
  const list = upcoming(filter);
  const summary = SUMMARIES[filter];

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              Plans
            </Text>
            <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
          </View>
          <IconButton icon="plus" label="Add plan" onPress={() => router.push('/plans/new')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {PLAN_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} pressed={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>

        <View style={styles.summaryWrap}>
          <View style={[styles.summary, { backgroundColor: summary.tint }]}>
            {summary.art}
            <Text style={[type.title, styles.ink]}>{summary.count(plansThisWeek(filter).length)}</Text>
            <Text style={[type.sub, styles.muted]}>This week</Text>
          </View>
        </View>

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
      <NavFade color={color.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingBottom: 200 },
  header: {
    paddingHorizontal: space.margin,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heading: { gap: space[4] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  filters: { paddingHorizontal: space.margin, paddingTop: space[20], paddingBottom: space[16], gap: space[8] },
  summaryWrap: { paddingHorizontal: space.margin },
  summary: {
    height: 124,
    paddingLeft: space[20],
    paddingTop: space[28],
    gap: space[4],
    borderRadius: radius.row,
    overflow: 'hidden',
  },
  upcoming: { paddingTop: space[28], paddingHorizontal: space.margin, gap: space[12] },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
