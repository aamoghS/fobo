import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, CharacterFigure } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { Sheet } from '@/components/Sheet';
import { loadLive, useLiveScreen } from '@/data/live';
import { bioFor, getPerson } from '@/data/people';
import { plans } from '@/data/plans';
import { localDay, NOW } from '@/data/week';
import { isOver, type FriendDay } from '@/features/friends/types';
import type { Plan } from '@/features/plans/types';
import { api, send } from '@/lib/api';
import { dateTile, shortDateRange, timeRange } from '@/lib/format';
import { notify } from '@/lib/notify';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '@fobo/core/constants';

const BANNER_ART = 190;

/** People detail (387:1613). */
export function PersonDetail({ id }: { id: string }) {
  'use no memo'; // Reads the in-memory sample data, which changes without new props; see live.ts.
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = getPerson(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const [days, setDays] = useState<FriendDay[] | null>(null);
  // Their next seven days, as much as they share: free or busy, and how full (GET /friends/:id/days).
  const checkAvailability = async () => {
    const to = new Date();
    to.setDate(to.getDate() + 6);
    const found = await api<FriendDay[]>('GET', `/friends/${id}/days?from=${localDay(new Date())}&to=${localDay(to)}`);
    // Null is a failed call, not "isn't sharing" (that's an empty list): say so and keep what's shown.
    if (!found) return notify("Couldn't check availability. Try again in a moment.");
    setDays(found);
  };

  const [more, setMore] = useState(false);
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    setRemoving(true);
    const result = await send('DELETE', `/friends/${id}`);
    setRemoving(false);
    if ('error' in result) return notify(result.error);
    setMore(false);
    await loadLive().catch(() => false);
    back();
  };

  const together = plans
    .filter((p) => p.with?.includes(id) && p.start >= NOW)
    .sort((a, b) => a.start.localeCompare(b.start));
  // Past together lists what's loaded (a few weeks back); the count comes from the API and goes further.
  const [showPast, setShowPast] = useState(false);
  const past = plans
    .filter((p) => p.with?.includes(id) && p.end < NOW)
    .sort((a, b) => b.start.localeCompare(a.start));

  const planRow = (p: Plan) => (
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
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
      <View style={styles.topBar}>
        {/* Design system Icon Button: back and more in the nav row. */}
        <IconButton icon="back" label="Back to People" onPress={back} />
        <IconButton icon="more" label="More" onPress={() => person && setMore(true)} />
      </View>

      {person && (
        <>
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <View style={[styles.banner, { backgroundColor: color[person.tint] ?? color.tintSky }]}>
                {/* Their character, zoomed in and cropped like Jun's drawn banner (387:1613). */}
                {person.character && <CharacterFigure character={person.character} size={BANNER_ART} style={styles.bannerArt} />}
              </View>
              <View style={styles.avatarSpace}>
                <View style={styles.avatar}>
                  <View style={styles.avatarRing}>
                    <Avatar person={person} size={98} />
                  </View>
                </View>
              </View>
              <Text accessibilityRole="header" style={[type.display, styles.ink, styles.name]}>
                {person.name}
              </Text>
              <View style={styles.bio}>
                <Text style={[type.sub, styles.muted]}>{bioFor(person)}</Text>
              </View>
              {/* Figma reads "Check availibility"; DESIGN.md §5 fixes the typo. */}
              <Button label="Check availability" trailingArrow style={styles.check} onPress={checkAvailability} />
              {days && (
                <View style={styles.days}>
                  {days.length === 0 && (
                    <Text style={[type.sub, styles.muted]}>{`${person.name} isn’t sharing their week yet.`}</Text>
                  )}
                  {days.map((d, i) => {
                    const tile = dateTile(d.date);
                    // Without their day load (they share only busy times), busy or free.
                    const state =
                      d.load === null ? (d.busy ? 'Busy' : 'Free')
                      : isOver(d) ? 'Too full'
                      : d.busy || d.load > 0 ? `${d.load} of ${DAY_ROOM}`
                      : 'Free';
                    const spans = d.blocks?.map((b) => timeRange(b.start, b.end)).join(', ');
                    return (
                      <View
                        key={d.date}
                        accessible
                        accessibilityLabel={[`${tile.weekday} ${tile.day}: ${state}`, spans, d.sharedPlanTitles?.join(', ')].filter(Boolean).join(', ')}
                        style={[styles.day, i < days.length - 1 && styles.rule]}>
                        <Text style={[type.foot, styles.muted, styles.dayName]}>{`${tile.weekday} ${tile.day}`}</Text>
                        <Text style={[type.bodyStrong, styles.ink]}>{state}</Text>
                        <View style={styles.dayPlans}>
                          {!!spans && <Text style={[type.foot, styles.muted, styles.dayPlansText]}>{spans}</Text>}
                          {d.sharedPlanTitles?.length ? (
                            <Text style={[type.foot, styles.muted, styles.dayPlansText]} numberOfLines={1}>
                              {d.sharedPlanTitles.join(', ')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          <View style={styles.together}>
            <Text accessibilityRole="header" style={[type.title, styles.ink]}>
              Next together
            </Text>
            {together.map(planRow)}
            {person.pastTogether !== undefined && (
              // Opens to the past plans loaded here; a plain row when none are.
              <Pressable
                accessibilityRole={past.length ? 'button' : undefined}
                accessibilityLabel={`Past together, ${person.pastTogether} plans`}
                accessibilityState={past.length ? { expanded: showPast } : undefined}
                disabled={!past.length}
                onPress={() => setShowPast(!showPast)}
                style={[styles.past, showPast && styles.rule]}>
                <Text style={[type.bodyStrong, styles.ink, styles.pastTitle]}>Past together</Text>
                <Text style={[type.foot, styles.muted, styles.pastCount]}>{`${person.pastTogether} plans`}</Text>
                {past.length > 0 && (
                  <View style={showPast && styles.chevronOpen}>
                    <Icon name="chevron" size={17} />
                  </View>
                )}
              </Pressable>
            )}
            {showPast && past.map(planRow)}
          </View>

          <Sheet visible={more} onClose={() => !removing && setMore(false)} title={person.name}>
            <Button label="Remove friend" disabled={removing} onPress={remove} />
          </Sheet>
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
  avatarSpace: { height: 42 },
  avatar: { position: 'absolute', left: space[8], top: -66, width: 108, height: 108 },
  avatarRing: { padding: 5, borderRadius: radius.full, backgroundColor: color.paper },
  name: { paddingTop: space[8] },
  bio: { paddingTop: space[4], paddingBottom: space[16], borderBottomWidth: 1, borderBottomColor: color.rule },
  check: { marginTop: space[16] },
  days: { marginTop: space[12] },
  day: { minHeight: 44, paddingVertical: space[8], gap: space[12], flexDirection: 'row', alignItems: 'center' },
  dayName: { width: 56 },
  dayPlans: { flex: 1 },
  dayPlansText: { textAlign: 'right' },
  together: { paddingTop: space[28], paddingHorizontal: space.margin },
  planRow: { paddingVertical: space[12], gap: space[16], flexDirection: 'row', alignItems: 'center' },
  rule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  planText: { flex: 1 },
  past: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  pastTitle: { flex: 1 },
  pastCount: { paddingRight: space[12] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
});
