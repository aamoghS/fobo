import { Animated, StyleSheet, Text, View } from 'react-native';

import SunshineFaceArt from '@/assets/illustrations/sunshine-face.svg';
import SunshinePetalsArt from '@/assets/illustrations/sunshine-petals.svg';
import { Scrap } from '@/components/Scrap';
import type { PlanKind } from '@/features/plans/types';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { lerp, useCycle, useSway } from './motion';

const ROWS: { title: string; kind: PlanKind }[] = [
  { title: 'Coffee', kind: 'enjoy' },
  { title: 'Team dinner', kind: 'social' },
  { title: 'Dentist', kind: 'obligation' },
  { title: 'Walk', kind: 'rest' },
];

const SUN = 62;

/** Start with a week you know: a paper calendar of cut-paper plans, with the sun peeking over its corner. */
export function CalendarArt() {
  // Slow: the petals take half a minute to turn once, and the page rocks on a long breath.
  const turn = useCycle(30000);
  const rock = useSway(5000);

  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.card, { transform: [{ rotate: lerp(rock, ['-3.5deg', '-2deg']) }] }]}>
        <View style={styles.top} />
        <View style={[styles.ring, { left: 34 }]} />
        <View style={[styles.ring, { right: 34 }]} />
        <View style={styles.rows}>
          {ROWS.map((r, i) => (
            <View key={r.title} style={styles.row}>
              <View style={styles.scrap}>
                <Scrap cut={r.kind} width={16} height={r.kind === 'rest' ? 11 : 18} seed={i + 3} />
              </View>
              <Text style={[type.label, styles.ink]} numberOfLines={1}>
                {r.title}
              </Text>
              <View style={styles.line} />
            </View>
          ))}
        </View>
      </Animated.View>
      <View style={styles.sun}>
        <Animated.View style={[styles.sunLayer, { transform: [{ rotate: lerp(turn, ['0deg', '360deg']) }] }]}>
          <SunshinePetalsArt width={SUN} height={SUN} />
        </Animated.View>
        <View style={styles.sunLayer}>
          <SunshineFaceArt width={SUN} height={SUN} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 205, height: 190, alignSelf: 'center' },
  card: {
    position: 'absolute',
    left: 16,
    top: 36,
    width: 164,
    paddingBottom: 12,
    borderWidth: 2,
    borderColor: color.ink,
    borderRadius: radius.md,
    backgroundColor: color.paper,
  },
  top: { height: 26, borderTopLeftRadius: radius.md - 2, borderTopRightRadius: radius.md - 2, backgroundColor: color.scrapWork },
  ring: { position: 'absolute', top: -8, width: 6, height: 18, borderRadius: radius.full, backgroundColor: color.ink },
  rows: { paddingTop: 8, paddingHorizontal: 10, gap: 6 },
  row: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 7 },
  scrap: { width: 16, height: 20, justifyContent: 'flex-end' },
  ink: { color: color.ink, flex: 1 },
  line: { width: 30, height: 7, borderRadius: radius.full, backgroundColor: color.fill },
  sun: { position: 'absolute', right: 0, top: 0, width: SUN, height: SUN },
  sunLayer: { position: 'absolute', left: 0, top: 0 },
});
