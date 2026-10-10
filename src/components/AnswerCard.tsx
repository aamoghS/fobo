import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Pressable } from './Pressable';

type Props = {
  title: string;
  caption: string;
  /** 95x104 character art. */
  Art: FC<SvgProps>;
  selected: boolean;
  onPress: () => void;
};

/**
 * Answer tile from Q1 (378:11162). Unselected as drawn; the selected state isn't drawn,
 * so it borrows the Choice Card's (34:992): ink fill, white title, ink-3 caption.
 */
export function AnswerCard({ title, caption, Art, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${title}. ${caption}`}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}>
      <View style={styles.inner}>
        <View importantForAccessibility="no-hide-descendants">
          <Art width={95} height={104} />
        </View>
        <Text style={[type.subStrong, styles.center, { color: selected ? color.selInk : color.ink }]}>{title}</Text>
        <Text style={[type.foot, styles.center, { color: selected ? color.ink3 : color.ink2 }]} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: color.paper2,
  },
  selected: { backgroundColor: color.selBg },
  inner: { width: '100%', alignItems: 'center' },
  center: { textAlign: 'center' },
});
