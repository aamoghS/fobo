import { StyleSheet, View } from 'react-native';

import { color, radius } from '@/styles/tokens';

/** Onboarding progress: segments h5, gap 15. Done is ink, to-do is ink-3 (DESIGN.md §3). */
export function Progress({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
      style={styles.track}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < step ? color.ink : color.ink3 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 15 },
  segment: { flex: 1, height: 5, borderRadius: radius.md },
});
