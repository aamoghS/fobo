import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { getPerson, people } from '@/data/people';
import { getPlan } from '@/data/plans';
import { dayAndHour } from '@/lib/format';
import { paperShadow } from '@/styles/shadow';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

// The featured plan on People. Its card art is a flattened export of 387:1470.
const FEATURED = 'comal';

/** People (387:1456). */
export function People() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [byName, setByName] = useState(false);

  const circle = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => p.name.toLowerCase().includes(q));
    return byName ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [query, byName]);

  const featured = getPlan(FEATURED);
  const host = featured?.with?.[0] ? getPerson(featured.with[0]) : undefined;
  const others = (featured?.with?.length ?? 1) - 1;
  const featuredWhen = featured && `${dayAndHour(featured.start)} · ${host?.name}${others ? ` + ${others}` : ''}`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 37) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            People
          </Text>
          <IconButton icon="plus" label="Add person" />
        </View>

        <Text accessibilityRole="header" style={[type.title, styles.ink, styles.section]}>
          Plans with people
        </Text>
        {featured && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${featured.title}, ${featuredWhen}`}
            onPress={() => router.push({ pathname: '/plans/[id]', params: { id: featured.id } })}
            style={styles.card}>
            <Image source={require('@/assets/people/comal-card.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.cardText}>
              <Text style={[type.title, styles.onArt]}>{featured.title}</Text>
              <Text style={[type.sub, styles.onArt, styles.cardWhen]}>{featuredWhen}</Text>
            </View>
            <View style={styles.cardChevron}>
              <Icon name="chevron" size={20} color={color.paper} />
            </View>
          </Pressable>
        )}

        <View style={styles.circleHeader}>
          <Text accessibilityRole="header" style={[type.title, styles.ink]}>
            Your circle
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={byName ? 'Sort by next plan' : 'Sort by name'}
            onPress={() => setByName((v) => !v)}
            hitSlop={12}
            style={styles.sort}>
            <Icon name="sort" size={17} color={color.ink2} />
            <Text style={[type.label, styles.muted]}>Sort</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <Icon name="search" size={18} color={color.ink2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find someone"
            placeholderTextColor={color.ink3}
            accessibilityLabel="Find someone"
            autoCapitalize="none"
            autoCorrect={false}
            style={[type.sub, styles.searchInput]}
          />
        </View>

        <View style={styles.list}>
          {circle.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.nextLabel}`}
              onPress={() => router.push({ pathname: '/people/[id]', params: { id: p.id } })}
              style={styles.row}>
              <Avatar person={p} />
              <View style={[styles.rowText, i < circle.length - 1 && styles.rowRule]}>
                <View style={styles.rowLines}>
                  <Text style={[type.bodyStrong, styles.ink]}>{p.name}</Text>
                  <Text style={[type.sub, styles.muted]}>{p.nextLabel}</Text>
                </View>
                <Icon name="chevron" size={19} color={color.ink2} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Fade into the nav, as drawn (387:1608). */}
      <View pointerEvents="none" style={styles.fade}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.057" stopColor={color.paper} stopOpacity={0} />
              <Stop offset="0.714" stopColor={color.paper} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: 20, paddingBottom: 200 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { paddingTop: 12, paddingBottom: 10 },
  card: { height: 196, borderRadius: radius.row, overflow: 'hidden' },
  cardText: { position: 'absolute', left: 16, top: 103, width: 156 },
  onArt: { color: color.selInk, textShadowColor: paperShadow.color, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  cardWhen: { opacity: 0.9 },
  cardChevron: { position: 'absolute', right: 12, top: 159 },
  circleHeader: { paddingTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: {
    marginTop: 19,
    height: 41,
    paddingHorizontal: 14,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.chip,
    backgroundColor: color.fill,
  },
  searchInput: { flex: 1, padding: 0, color: color.ink, outlineWidth: 0 },
  list: { paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rowText: { flex: 1, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.divider },
  rowLines: { flex: 1 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 238 },
});
