import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BadgeBlue from '@/assets/profile/badge-blue.svg';
import BadgeGreen from '@/assets/profile/badge-green.svg';
import BadgePink from '@/assets/profile/badge-pink.svg';
import BadgeRed from '@/assets/profile/badge-red.svg';
import Squiggle from '@/assets/profile/squiggle.svg';
import WidgetScraps from '@/assets/profile/widget-scraps.svg';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { achievements, profile, widget } from '@/data/profile';
import { useCharacter } from '@/features/profile/character';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { CharacterArt } from './CharacterArt';

const badges = { red: BadgeRed, pink: BadgePink, green: BadgeGreen, blue: BadgeBlue };

/**
 * Profile v.1 (443:3735), the You tab. The Appearance section (Light / Dark / Match System)
 * is left out: the app is light only (DESIGN.md).
 */
export function Profile() {
  const router = useRouter();
  useLiveScreen();
  const insets = useSafeAreaInsets();
  const character = useCharacter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28) }]}>
      <View style={styles.hero}>
        <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
          <Squiggle width="100%" height={184} preserveAspectRatio="xMidYMid slice" />
        </View>
        <View style={styles.heroCharacter}>
          <CharacterArt character={character} size={155} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/you/settings')}
          style={styles.settings}>
          <Icon name="settings" />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={styles.names}>
          <Text accessibilityRole="header" style={[type.title, styles.ink]}>
            {profile.name}
          </Text>
          <Text style={[type.sub, styles.ink]}>{profile.title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit Character"
          onPress={() => router.push('/you/character')}
          hitSlop={{ top: 4, bottom: 4 }}
          style={styles.editCharacter}>
          <Icon name="pencil" />
          <Text style={[type.label, styles.ink]}>Edit Character</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update your capacity profile"
        onPress={() => router.push('/you/capacity')}
        style={styles.capacity}>
        <Icon name="refresh" color={color.paper} />
        <View style={styles.capacityText}>
          <Text style={[type.body, styles.onInk]}>Update your capacity profile!</Text>
          <Text style={[type.foot, styles.onInk]}>It’s been a while since you’ve updated us. Let us know if anything’s changed.</Text>
        </View>
        <Icon name="chevron" color={color.paper} />
      </Pressable>

      <View style={styles.streak} accessible accessibilityLabel={`${profile.streak.title} ${profile.streak.detail}`}>
        <View style={styles.streakTop}>
          <View style={styles.bolt}>
            <Icon name="bolt" size={22} />
          </View>
          <View>
            <Text style={[type.bodyStrong, styles.ink]}>{profile.streak.title}</Text>
            <Text style={[type.foot, styles.ink]}>{profile.streak.detail}</Text>
          </View>
        </View>
        <View style={styles.streakBars}>
          {Array.from({ length: profile.streak.of }, (_, i) => (
            <View key={i} style={[styles.streakBar, { backgroundColor: i < profile.streak.days ? color.highlight : color.divider }]} />
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
          Achievements
        </Text>
        <Pressable accessibilityRole="button" hitSlop={12}>
          <Text style={[type.foot, styles.ink, styles.underline]}>See all</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.achievements}>
        {achievements.map((a) => {
          const Badge = badges[a.badge];
          return (
            <View key={a.id} style={styles.achievement} accessible accessibilityLabel={a.title}>
              <View style={styles.badge}>
                <Badge width={92.8} height={95} />
                <View style={styles.badgeIcon}>
                  <Icon name={a.icon} />
                </View>
              </View>
              <Text style={[type.label, styles.ink, styles.achievementTitle]} numberOfLines={1}>
                {a.title}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink, styles.widgetsHead]}>
        Home Screen Widgets
      </Text>
      {/* Background art is a PNG; the copy stays live because it will come from the API. */}
      <View style={styles.widget}>
        <Image source={require('@/assets/profile/widget-bg.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.widgetCard}>
          <Text style={[type.bodyStrong, styles.muted]}>{widget.label}</Text>
          <Text style={[type.subStrong, styles.ink, styles.widgetHeadline]}>{widget.headline}</Text>
          <Text style={[type.bodyStrong, styles.ink, styles.widgetNext]}>{widget.next}</Text>
          <Text style={[type.subStrong, styles.muted]}>{widget.nudge}</Text>
          <View style={styles.widgetScraps} importantForAccessibility="no-hide-descendants">
            <WidgetScraps width={141} height={77} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  onInk: { color: color.selInk },
  underline: { textDecorationLine: 'underline' },
  hero: { height: 184, borderRadius: radius.panel, overflow: 'visible' },
  heroCharacter: { position: 'absolute', left: '50%', marginLeft: -78, top: 13 },
  settings: { position: 'absolute', top: -1, right: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identity: { marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  names: { gap: 4 },
  editCharacter: {
    height: 36,
    paddingLeft: 12,
    paddingRight: 16,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  capacity: {
    marginTop: 26,
    marginHorizontal: -9,
    minHeight: 95,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.panel,
    backgroundColor: color.ink,
  },
  capacityText: { flex: 1, gap: 7 },
  streak: {
    marginTop: 37,
    marginHorizontal: -9,
    paddingTop: 13,
    paddingBottom: 11,
    paddingHorizontal: 11,
    gap: 11,
    borderRadius: radius.md,
    backgroundColor: color.tintButter,
  },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bolt: { width: 37, height: 37, borderRadius: radius.full, backgroundColor: color.highlight, alignItems: 'center', justifyContent: 'center' },
  streakBars: { flexDirection: 'row', gap: 12, paddingRight: 22 },
  streakBar: { flex: 1, height: 4, borderRadius: radius.full },
  sectionHead: { marginTop: 32, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bleed: { marginHorizontal: -20 },
  achievements: { paddingHorizontal: 17, paddingTop: 20, gap: 12 },
  achievement: { width: 137, height: 129, alignItems: 'center', borderRadius: radius.panel, backgroundColor: color.fill },
  badge: { marginTop: 6, width: 92.8, height: 95, alignItems: 'center' },
  badgeIcon: { position: 'absolute', top: 32, left: 0, right: 0, alignItems: 'center' },
  achievementTitle: { position: 'absolute', top: 98, left: 4, right: 4, textAlign: 'center' },
  widgetsHead: { marginTop: 30 },
  widget: { marginTop: 13, height: 203, borderRadius: radius.md, overflow: 'hidden' },
  widgetCard: {
    position: 'absolute',
    left: 18.4,
    right: 18.4,
    top: 12.6,
    height: 178,
    paddingLeft: 13.6,
    paddingTop: 12.4,
    borderRadius: radius.md,
    backgroundColor: color.paper,
  },
  widgetHeadline: { width: 163 },
  widgetNext: { marginTop: 17 },
  widgetScraps: { position: 'absolute', left: 179.6, top: 105.4 },
});
