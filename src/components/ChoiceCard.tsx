import { StyleSheet, Text } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { PaperSpirit, type SpiritMood } from './PaperSpirit';
import { Pressable } from './Pressable';

type Props = {
  title: string;
  detail: string;
  mood: SpiritMood;
  selected: boolean;
  onPress?: () => void;
};

/** Choice Card 34:987. 114x156 answer tile with a character; selected goes ink. */
export function ChoiceCard({ title, detail, mood, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}>
      <PaperSpirit mood={mood} size={57.6} />
      <Text style={[type.bodyStrong, styles.center, { color: selected ? color.selInk : color.ink }]}>{title}</Text>
      <Text style={[type.sub, styles.center, styles.detail, { color: selected ? color.ink3 : color.ink2 }]}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 114,
    height: 156,
    paddingHorizontal: 10,
    paddingVertical: 16,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.row,
    backgroundColor: color.fill,
  },
  selected: {
    backgroundColor: color.selBg,
  },
  center: {
    textAlign: 'center',
  },
  detail: {
    width: 94,
  },
});
