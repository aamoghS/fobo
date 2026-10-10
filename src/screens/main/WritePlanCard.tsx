import type { ReactNode } from 'react';
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

      <Text style={[type.label, styles.muted]}>Your plan</Text>
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
        <Icon name="paste" size={16} color={color.ink2} />
        <Text style={[type.subStrong, styles.muted]}>Paste</Text>
      </Pressable>

      {/* Insight Row shape (DS): icon, a quiet label over a strong line, then a way in. */}
      <Row
        icon={person ? <Avatar person={person} size={24} /> : <Icon name="people" size={20} color={color.ink2} />}
        label="With"
        value={withLabel}
        empty="Who’s going?"
        trailing="chevron"
      />
      <Row icon={<Icon name="calendar" size={20} color={color.ink2} />} label="When" value={start ? dayAndTime(start) : undefined} empty="When is it?" trailing="pencil" />
    </View>
  );
}

type RowProps = { icon: ReactNode; label: string; value?: string; empty: string; trailing: 'chevron' | 'pencil' };

function Row({ icon, label, value, empty, trailing }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[type.foot, styles.muted]}>{label}</Text>
        <Text style={[type.subStrong, value ? styles.ink : styles.faint]} numberOfLines={1}>
          {value ?? empty}
        </Text>
      </View>
      <Icon name={trailing} size={18} color={color.ink3} />
    </View>
  );
}

/** Two little guys on a cushion, cut off by the card's corner. */
function Characters() {
  return (
    <View style={styles.characters} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={styles.cushion}>
        <Scrap cut="rest" width={72} height={14} seed={3} />
      </View>
      <View style={styles.red}>
        <Scrap cut="social" width={32} height={30} seed={11} />
        <View style={styles.redFace}>
          <View style={{ marginLeft: -6 }}>
            <FineEyes />
          </View>
        </View>
      </View>
      <View style={styles.blue}>
        <Scrap cut="obligation" fill={color.scrapWork} width={30} height={36} seed={7} />
        <View style={styles.blueFace}>
          <AsleepFace />
        </View>
      </View>
    </View>
  );
}

const FineEyes = () => <FineEyesArt width={44} height={(30 * 44) / 46} color={color.creatureInk} />;
const AsleepFace = () => <AsleepFaceArt width={32} height={(24 * 32) / 46} color={color.creatureInk} />;

const styles = StyleSheet.create({
  card: {
    marginTop: space[16],
    paddingTop: space[20],
    paddingHorizontal: space[20],
    paddingBottom: space[8],
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
    overflow: 'hidden',
  },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  faint: { color: color.ink3 },
  // Room on the right so the label and first line clear the characters.
  input: { minHeight: 72, marginTop: space[4], paddingRight: 84, paddingTop: 0, paddingBottom: 0, textAlignVertical: 'top', outlineWidth: 0 },
  paste: {
    alignSelf: 'flex-start',
    marginTop: space[12],
    marginBottom: space[16],
    height: 32,
    paddingHorizontal: space[12],
    gap: space[8],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  row: { minHeight: 60, gap: space[12], flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: color.rule },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
  // Top-right corner, standing on the cushion, fully inside the card.
  characters: { position: 'absolute', top: space[12], right: space[16], width: 72, height: 46 },
  cushion: { position: 'absolute', right: 0, bottom: 0 },
  red: { position: 'absolute', left: 4, bottom: 4 },
  redFace: { position: 'absolute', top: -6, left: 0 },
  blue: { position: 'absolute', left: 38, bottom: 6 },
  blueFace: { position: 'absolute', top: 5, left: -1 },
});
