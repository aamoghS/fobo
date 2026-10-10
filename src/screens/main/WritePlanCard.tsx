import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import AsleepFaceArt from '@/assets/faces/asleep.svg';
import FineEyesArt from '@/assets/faces/fine-eyes.svg';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { Scrap } from '@/components/Scrap';
import { people as circle } from '@/data/people';
import { dayAndTime } from '@/lib/format';
import { readPlan } from '@/lib/read-plan';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Write a plan card from Tory's mockup: the plan as typed, then who and when read out of it. */
export function WritePlanCard({ text, onChangeText }: { text: string; onChangeText: (t: string) => void }) {
  const { people, start } = readPlan(text);
  const first = people[0];
  const person = first && circle.find((p) => p.name.toLowerCase() === first.toLowerCase());
  const withLabel = first ? (people.length > 1 ? `${first} + ${people.length - 1}` : first) : undefined;

  const paste = async () => {
    // Web only for now: native needs expo-clipboard, which isn't a dependency yet.
    if (Platform.OS !== 'web') return;
    const pasted = await navigator.clipboard?.readText().catch(() => '');
    if (pasted) onChangeText(pasted.trim());
  };

  return (
    <View style={styles.card}>
      <Characters />

      <Text style={[type.sub, styles.muted]}>Your plan</Text>
      <TextInput
        value={text}
        onChangeText={onChangeText}
        multiline
        placeholder="Dinner at Comal on Saturday at 7 PM with Dani, Mara and Jonah."
        placeholderTextColor={color.ink3}
        accessibilityLabel="Your plan"
        style={[type.body, styles.ink, styles.input]}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="Paste an invite" onPress={paste} hitSlop={8} style={styles.paste}>
        <Icon name="paste" size={22} color={color.ink2} />
        <Text style={[type.bodyStrong, styles.muted]}>Paste</Text>
      </Pressable>

      <View style={[styles.row, styles.rule]}>
        <Text style={[type.bodyStrong, styles.muted, styles.withLabel]}>With</Text>
        {person ? <Avatar person={person} size={44} /> : withLabel && <View style={styles.blankAvatar}><Icon name="people" size={20} color={color.ink2} /></View>}
        <Text style={[type.bodyStrong, withLabel ? styles.ink : styles.faint, styles.rowText]}>{withLabel ?? 'Who’s going?'}</Text>
        <Icon name="chevron" size={20} color={color.ink2} />
      </View>

      <View style={[styles.row, styles.rule]}>
        <Icon name="calendar" size={24} color={color.ink2} />
        <Text style={[type.bodyStrong, start ? styles.ink : styles.faint, styles.rowText]}>{start ? dayAndTime(start) : 'When is it?'}</Text>
        <Icon name="pencil" size={20} color={color.ink2} />
      </View>
    </View>
  );
}

/** Two little guys on a cushion, cut off by the card's corner. */
function Characters() {
  return (
    <View style={styles.characters} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={styles.cushion}>
        <Scrap cut="rest" width={92} height={18} seed={3} />
      </View>
      <View style={styles.red}>
        <Scrap cut="social" width={42} height={38} seed={11} />
        <View style={styles.redFace}>
          <View style={{ marginLeft: -7 }}>
            <FineEyes />
          </View>
        </View>
      </View>
      <View style={styles.blue}>
        <Scrap cut="obligation" fill={color.scrapWork} width={40} height={50} seed={7} />
        <View style={styles.blueFace}>
          <AsleepFace />
        </View>
      </View>
    </View>
  );
}

const FineEyes = () => <FineEyesArt width={58} height={(30 * 58) / 46} color={color.creatureInk} />;
const AsleepFace = () => <AsleepFaceArt width={44} height={(24 * 44) / 46} color={color.creatureInk} />;

const styles = StyleSheet.create({
  card: {
    marginTop: space[16],
    paddingTop: 68,
    paddingHorizontal: space[20],
    paddingBottom: space[4],
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
    overflow: 'hidden',
  },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  faint: { color: color.ink3 },
  input: { minHeight: 84, paddingTop: space[8], textAlignVertical: 'top' },
  paste: { alignSelf: 'flex-start', marginTop: space[8], marginBottom: space[12], paddingVertical: space[8], gap: space[8], flexDirection: 'row', alignItems: 'center' },
  row: { minHeight: 64, gap: space[12], flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  withLabel: { width: 44 },
  blankAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: color.fill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  characters: { position: 'absolute', top: 10, right: -8, width: 130, height: 60 },
  cushion: { position: 'absolute', right: 0, bottom: 0 },
  red: { position: 'absolute', left: 0, bottom: 2 },
  redFace: { position: 'absolute', top: -9, left: 0 },
  blue: { position: 'absolute', left: 54, bottom: 8 },
  blueFace: { position: 'absolute', top: 6, left: -2 },
});
