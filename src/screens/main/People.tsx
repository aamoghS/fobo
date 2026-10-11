import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { NavFade } from '@/components/NavFade';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { getPerson, people } from '@/data/people';
import { getPlan } from '@/data/plans';
import { dayAndHour } from '@/lib/format';
import { paperShadow } from '@/styles/shadow';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

// The featured plan on People. Its card art is a flattened export of 387:1470.
const FEATURED = 'comal';

/** People (387:1456). */
export function People() {
  'use no memo'; // Reads the in-memory sample data, which changes without new props; see live.ts.
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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]} keyboardShouldPersistTaps="handled">
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

      <NavFade color={color.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 200 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { paddingTop: space[28], paddingBottom: space[12] },
  card: { height: 196, borderRadius: radius.row, overflow: 'hidden' },
  cardText: { position: 'absolute', left: space[16], top: 103, width: 156 },
  onArt: { color: color.selInk, textShadowColor: paperShadow.color, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  cardWhen: { opacity: 0.9 },
  cardChevron: { position: 'absolute', right: space[12], top: 159 },
  circleHeader: { paddingTop: space[28], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  search: {
    marginTop: space[16],
    height: 44,
    paddingHorizontal: space[12],
    gap: space[8],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.chip,
    backgroundColor: color.fill,
  },
  searchInput: { flex: 1, padding: 0, color: color.ink, outlineWidth: 0 },
  list: { paddingTop: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  rowText: { flex: 1, paddingVertical: space[16], flexDirection: 'row', alignItems: 'center' },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  rowLines: { flex: 1 },
});
