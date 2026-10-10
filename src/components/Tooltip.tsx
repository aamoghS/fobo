import { StyleSheet, Text, View } from 'react-native';

import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Ink bubble floating above or below its target without affecting the surrounding layout. */
export function Tooltip({ text, visible, placement = 'above' }: { text: string; visible: boolean; placement?: 'above' | 'below' }) {
  if (!visible) return null;
  return (
    <View style={placement === 'below' ? styles.below : styles.wrap} pointerEvents="none">
      {placement === 'below' && <View style={[styles.tail, styles.tailAbove]} />}
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.bubble}>
        <Text style={[type.label, styles.text]}>{text}</Text>
      </View>
      {placement === 'above' && <View style={styles.tail} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 10, alignItems: 'center' },
  below: { position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 10, alignItems: 'center' },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: color.ink,
    boxShadow: shadow.soft,
  },
  text: { color: color.paper, textAlign: 'center' },
  // A small square turned 45° and tucked under the bubble.
  tail: { width: 12, height: 12, marginTop: -7, backgroundColor: color.ink, transform: [{ rotate: '45deg' }] },
  tailAbove: { marginTop: 0, marginBottom: -7 },
});
