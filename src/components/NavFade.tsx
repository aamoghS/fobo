import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Content fades into the screen's ground under the floating nav, as drawn on People (387:1608). */
export function NavFade({ color }: { color: string }) {
  const id = useId();
  return (
    <View pointerEvents="none" style={styles.fade}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.057" stopColor={color} stopOpacity={0} />
            <Stop offset="0.714" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 238 },
});
