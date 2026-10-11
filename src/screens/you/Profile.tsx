import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Medal } from '@/components/Medal';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { achievements, allAchievements, profile, type Achievement } from '@/data/profile';
import { useCharacter } from '@/features/profile/character';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { CharacterArt } from './CharacterArt';

// A card's paper, from the badge's colour family.
const tint: Record<Achievement['badge'], keyof typeof color> = { red: 'tintPeach', pink: 'tintRose', green: 'tintMint', blue: 'tintSky' };

/**
 * Profile (572:3027), the You tab: a profile card (banner, your character in a round frame you can
 * edit, name and title), the capacity profile nudge, your streak, and achievements.
 */
export function Profile() {
  const router = useRouter();
  useLiveScreen();
  const insets = useSafeAreaInsets();
  const character = useCharacter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 40) }]}>
      <View style={styles.card}>
        <View style={styles.banner} importantForAccessibility="no-hide-descendants">
          {/* Your character again, mirrored and leaning in from the right. */}
          <View style={styles.bannerCharacter}>
            <CharacterArt character={character} size={155} />
          </View>
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <View style={styles.avatarInner} importantForAccessibility="no-hide-descendants">
              <CharacterArt character={character} size={115} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit Character"
              onPress={() => router.push('/you/character')}
              hitSlop={7}
              style={styles.edit}>
              <Icon name="pencil" size={15} color={color.selInk} />
            </Pressable>
          </View>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/you/settings')} />
        </View>

        <View style={styles.names}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            {profile.name}
          </Text>
          <Text style={[type.sub, styles.muted, styles.title]}>{profile.title}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update your capacity profile"
        onPress={() => router.push('/you/capacity')}
        style={styles.capacity}>
        <Icon name="refresh" color={color.selInk} />
        <View style={styles.capacityText}>
          <Text style={[type.body, styles.onInk]}>Update your capacity profile!</Text>
          <Text style={[type.foot, styles.onInk]}>It’s been a while since you’ve updated us. Let us know if anything’s changed.</Text>
        </View>
        <Icon name="chevron" color={color.selInk} />
      </Pressable>

      <View style={styles.streak} accessible accessibilityLabel={`${profile.streak.title} ${profile.streak.detail}`}>
        <View style={styles.bolt}>
          <Icon name="bolt" size={22} />
        </View>
        <View style={styles.streakText}>
          <Text style={[type.bodyStrong, styles.ink]}>{profile.streak.title}</Text>
          <Text style={[type.foot, styles.ink]}>{profile.streak.detail}</Text>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
          Achievements
        </Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.push('/you/achievements')}>
          <Text style={[type.foot, styles.ink, styles.underline]}>See all</Text>
        </Pressable>
      </View>
      <AchievementCarousel onSeeAll={() => router.push('/you/achievements')} />
    </ScrollView>
  );
}

/** What you've unlocked, a card each, swiped sideways; it ends on the next one to earn. */
function AchievementCarousel({ onSeeAll }: { onSeeAll: () => void }) {
  const { width } = useWindowDimensions();
  // About two thirds of the column, so the next card peeks in.
  const card = Math.round(Math.min(width, 430) * 0.6);
  const next = allAchievements.find((a) => !achievements.some((e) => e.id === a.id));
  const count = achievements.length + (next ? 1 : 0);
  const [at, setAt] = useState(0);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={card + CARD_GAP}
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={(e) => setAt(Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / (card + CARD_GAP)))))}
        style={styles.bleed}
        contentContainerStyle={styles.achievements}>
        {achievements.map((a) => (
          <View key={a.id} style={[styles.achievement, { width: card, backgroundColor: color[tint[a.badge]] }]} accessible accessibilityLabel={`${a.title}, unlocked. ${a.how}`}>
            <Medal badge={a.badge} icon={a.icon} size={104} ribbon />
            <Text style={[type.bodyStrong, styles.ink, styles.center, styles.toBottom]} numberOfLines={1}>
              {a.title}
            </Text>
          </View>
        ))}
        {next && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Next to unlock: ${next.title}. ${next.how}`}
            onPress={onSeeAll}
            style={[styles.achievement, styles.locked, { width: card }]}>
            <Medal badge={next.badge} icon={next.icon} size={104} locked />
            <Text style={[type.label, styles.muted, styles.toBottom]}>Up next</Text>
            <Text style={[type.bodyStrong, styles.ink, styles.center]} numberOfLines={1}>
              {next.title}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      {count > 1 && (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={[styles.dot, i === at && styles.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

const CARD_GAP = 12;
const AVATAR = 108;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 120, gap: space[20] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  onInk: { color: color.selInk },
  underline: { textDecorationLine: 'underline' },

  card: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 15, borderRadius: 22, backgroundColor: color.paper, boxShadow: shadow.soft },
  banner: { height: 138, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.scrapWork },
  // Figma's 155x182 character, flipped and turned about 12° (its box sits at 171,-20 in the banner).
  bannerCharacter: { position: 'absolute', left: 189, top: -6, transform: [{ rotate: '12deg' }, { scaleX: -1 }] },
  // The avatar rises 54px into the banner; the row keeps only the settings button's height below it.
  avatarRow: { height: 62, marginBottom: -12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { position: 'absolute', left: 8, top: 12 - 66, width: AVATAR, height: AVATAR, borderRadius: radius.full, backgroundColor: color.paper },
  avatarInner: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 5,
    height: 101,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    // The character fills the frame and is cut off below its eyes' row, as in Figma.
    paddingTop: 4,
    backgroundColor: color.tintButter,
  },
  edit: { position: 'absolute', left: 74, top: 76, width: 31, height: 31, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.accent },
  names: { alignSelf: 'flex-start', paddingTop: space[8], gap: 2 },
  title: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.divider },

  capacity: {
    minHeight: 95,
    paddingLeft: 15,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.panel,
    backgroundColor: color.ink,
  },
  capacityText: { flex: 1, gap: 7 },
  streak: { padding: 12, gap: 9, flexDirection: 'row', alignItems: 'center' },
  streakText: { flex: 1 },
  bolt: { width: 37, height: 37, borderRadius: radius.full, backgroundColor: color.moodBright, alignItems: 'center', justifyContent: 'center' },

  sectionHead: { marginTop: space[8], flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bleed: { marginHorizontal: -space.margin },
  center: { textAlign: 'center' },
  achievements: { paddingHorizontal: space.margin, gap: CARD_GAP },
  // No minimum: the card ends just under the title (the how-to stays in the label and on See all).
  // Pushes a card's words to its bottom, so every title sits on the same line across the row.
  toBottom: { marginTop: 'auto' },
  achievement: { paddingTop: 18, paddingBottom: 20, paddingHorizontal: 14, gap: 4, alignItems: 'center', borderRadius: radius.panel },
  locked: { justifyContent: 'center', backgroundColor: color.fill, paddingTop: 30 },
  dots: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.ink3, opacity: 0.35 },
  dotOn: { width: 18, backgroundColor: color.ink, opacity: 1 },
});
