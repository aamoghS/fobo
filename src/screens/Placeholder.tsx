import { StyleSheet, Text, View } from 'react-native';

import { color } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Dev-only stand-in for screens that aren't built yet. Not designed copy. */
export function Placeholder({ name, node }: { name: string; node?: string }) {
  return (
    <View style={styles.screen}>
      <Text style={[type.title, styles.ink]}>{name}</Text>
      <Text style={[type.sub, styles.muted]}>{node ? `Not built yet · Figma ${node}` : 'Not built yet'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: color.ground },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
});
