import { StyleSheet, Text } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

type Props = {
  prompt: string;
  link: string;
  /** Sign up sets the prompt in Body Strong, Login in Body (as drawn). */
  strongPrompt?: boolean;
  onPress: () => void;
};

/** `.btn.text` with an underlined ink link: "Already have an account? Log in". */
export function SwitchLink({ prompt, link, strongPrompt = false, onPress }: Props) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${prompt} ${link}`} onPress={onPress} style={styles.row}>
      <Text style={[strongPrompt ? type.bodyStrong : type.body, styles.prompt]}>
        {prompt} <Text style={[type.bodyStrong, styles.link]}>{link}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 54,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  prompt: { color: color.ink2 },
  link: { color: color.ink, textDecorationLine: 'underline' },
});
