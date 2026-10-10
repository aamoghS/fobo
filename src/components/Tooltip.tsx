import { StyleSheet, Text, View } from 'react-native';

import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Ink bubble that sits above whatever it wraps, its tail pointing down at it. Read out when it appears. */
export function Tooltip({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.bubble}>
        <Text style={[type.label, styles.text]}>{text}</Text>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 10, alignItems: 'center' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: color.ink,
    boxShadow: shadow.soft,
  },
  text: { color: color.paper, textAlign: 'center' },
  // A small square turned 45° and tucked under the bubble.
  tail: { width: 12, height: 12, marginTop: -7, backgroundColor: color.ink, transform: [{ rotate: '45deg' }] },
});
