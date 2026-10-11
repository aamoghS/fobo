import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import JunAvatar from '@/assets/people/jun-avatar.svg';
import { FaceAvatar, personArt } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { bioFor, getPerson } from '@/data/people';
import { plans } from '@/data/plans';
import { NOW } from '@/data/week';
import { shortDateRange } from '@/lib/format';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

// Jun's banner and large avatar are exports of 387:1613 (the banner has its own painted ground).
const BANNERS: Record<string, number> = { jun: require('@/assets/people/jun-banner.png') };
// Transparent cut-outs from Tory: the character with a prop or two, right-aligned on the person's tint.
// Sized so the props clear the avatar that overlaps the banner's bottom-left.
const CUTOUTS: Record<string, { source: number; width: number; height: number }> = {
  hana: { source: require('@/assets/people/hana-banner.png'), width: 216, height: 98 },
  dani: { source: require('@/assets/people/dani-banner.png'), width: 191, height: 130 },
  ava: { source: require('@/assets/people/ava-banner.png'), width: 212, height: 112 },
};
const BANNER_ART = 190;

/** People detail (387:1613). */
export function PersonDetail({ id }: { id: string }) {
  'use no memo'; // Reads the in-memory sample data, which changes without new props; see live.ts.
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = getPerson(id);
  const Art = personArt(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const together = plans
    .filter((p) => p.with?.includes(id) && p.start >= NOW)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
      <View style={styles.topBar}>
        {/* Design system Icon Button: back and more in the nav row. */}
        <IconButton icon="back" label="Back to People" onPress={back} />
        <IconButton icon="more" label="More" />
      </View>

      {person && (
        <>
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <View style={[styles.banner, { backgroundColor: color[person.tint] }]}>
                {BANNERS[id] ? (
                  <Image source={BANNERS[id]} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : CUTOUTS[id] ? (
                  <Image source={CUTOUTS[id].source} style={[styles.cutout, { width: CUTOUTS[id].width, height: CUTOUTS[id].height }]} contentFit="contain" />
                ) : (
                  // No drawn banner yet: their character, zoomed in and cropped like Jun's.
                  Art && <Art width={BANNER_ART} height={BANNER_ART} style={styles.bannerArt} />
                )}
              </View>
              <View style={styles.avatarSpace}>
                <View style={styles.avatar}>
                  {id === 'jun' ? (
                    <JunAvatar width={108} height={108} />
                  ) : (
                    <View style={styles.avatarRing}>
                      <FaceAvatar person={person} size={98} />
                    </View>
                  )}
                </View>
              </View>
              <Text accessibilityRole="header" style={[type.display, styles.ink, styles.name]}>
                {person.name}
              </Text>
              <View style={styles.bio}>
                <Text style={[type.sub, styles.muted]}>{bioFor(person)}</Text>
              </View>
              {/* Figma reads "Check availibility"; DESIGN.md §5 fixes the typo. */}
              <Button label="Check availability" trailingArrow style={styles.check} />
            </View>
          </View>

          <View style={styles.together}>
            <Text accessibilityRole="header" style={[type.title, styles.ink]}>
              Next together
            </Text>
            {together.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.title}, ${shortDateRange(p.start, p.end)}`}
                onPress={() => router.push({ pathname: '/plans/[id]', params: { id: p.id } })}
                style={[styles.planRow, styles.rule]}>
                <Icon name={p.icon ?? 'box'} color={color.ink2} />
                <View style={styles.planText}>
                  <Text style={[type.bodyStrong, styles.ink]}>{p.title}</Text>
                  <Text style={[type.foot, styles.muted]}>{shortDateRange(p.start, p.end)}</Text>
                </View>
                <Icon name="chevron" size={17} />
              </Pressable>
            ))}
            {person.pastTogether !== undefined && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Past together, ${person.pastTogether} plans`} style={styles.past}>
                <Text style={[type.bodyStrong, styles.ink, styles.pastTitle]}>Past together</Text>
                <Text style={[type.foot, styles.muted, styles.pastCount]}>{`${person.pastTogether} plans`}</Text>
                <Icon name="chevron" size={17} />
              </Pressable>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingBottom: 120 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  topBar: { paddingHorizontal: space.margin, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardWrap: { paddingTop: space[16], paddingHorizontal: space.margin },
  card: {
    padding: space[16],
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
  banner: { height: 138, borderRadius: radius.chip, overflow: 'hidden' },
  bannerArt: { position: 'absolute', right: 14, top: -22, transform: [{ rotate: '-8deg' }] },
  // Stands on the banner's bottom edge, a touch cut off, like Jun's cushion.
  cutout: { position: 'absolute', right: space[12], bottom: -3 },
  avatarSpace: { height: 42 },
  avatar: { position: 'absolute', left: space[8], top: -66, width: 108, height: 108 },
  avatarRing: { padding: 5, borderRadius: radius.full, backgroundColor: color.paper },
  name: { paddingTop: space[8] },
  bio: { paddingTop: space[4], paddingBottom: space[16], borderBottomWidth: 1, borderBottomColor: color.rule },
  check: { marginTop: space[16] },
  together: { paddingTop: space[28], paddingHorizontal: space.margin },
  planRow: { paddingVertical: space[12], gap: space[16], flexDirection: 'row', alignItems: 'center' },
  rule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  planText: { flex: 1 },
  past: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  pastTitle: { flex: 1 },
  pastCount: { paddingRight: space[12] },
});
