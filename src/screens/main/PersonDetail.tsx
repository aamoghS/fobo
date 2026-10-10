import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import JunAvatar from '@/assets/people/jun-avatar.svg';
import { FaceAvatar, personArt } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { getPerson } from '@/data/people';
import { plans } from '@/data/plans';
import { NOW } from '@/data/week';
import { shortDateRange } from '@/lib/format';
import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

// Only Jun's profile is drawn (387:1613); its banner and large avatar are exports of that frame.
const BANNERS: Record<string, number> = { jun: require('@/assets/people/jun-banner.png') };
const BANNER_ART = 190;

/** People detail (387:1613). */
export function PersonDetail({ id }: { id: string }) {
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
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 34) }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to People" onPress={back} hitSlop={10} style={styles.back}>
          <Icon name="back" size={22} />
          <Text style={[type.bodyStrong, styles.ink]}>People</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More" hitSlop={4} style={styles.more}>
          <Icon name="more" size={19} />
        </Pressable>
      </View>

      {person && (
        <>
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <View style={[styles.banner, { backgroundColor: color[person.tint] }]}>
                {BANNERS[id] ? (
                  <Image source={BANNERS[id]} style={StyleSheet.absoluteFill} contentFit="cover" />
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
                {person.bio && <Text style={[type.sub, styles.muted]}>{person.bio}</Text>}
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
  screen: { flex: 1, backgroundColor: color.groundAlt },
  content: { paddingBottom: 120 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  topBar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  cardWrap: { paddingTop: 13, paddingHorizontal: 15 },
  card: {
    paddingTop: 14,
    paddingBottom: 15,
    paddingHorizontal: 14,
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
  banner: { height: 138, borderRadius: radius.lg, overflow: 'hidden' },
  bannerArt: { position: 'absolute', right: 14, top: -22, transform: [{ rotate: '-8deg' }] },
  avatarSpace: { height: 42 },
  avatar: { position: 'absolute', left: 8, top: -66, width: 108, height: 108 },
  avatarRing: { padding: 5, borderRadius: radius.full, backgroundColor: color.paper },
  name: { paddingTop: 8 },
  bio: { paddingTop: 2, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.divider },
  check: { marginTop: 17 },
  together: { paddingTop: 24, paddingHorizontal: 22 },
  planRow: { paddingTop: 10, paddingBottom: 15, gap: 18, flexDirection: 'row', alignItems: 'center' },
  rule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  planText: { flex: 1 },
  past: { height: 64, flexDirection: 'row', alignItems: 'center' },
  pastTitle: { flex: 1 },
  pastCount: { paddingRight: 12 },
});
