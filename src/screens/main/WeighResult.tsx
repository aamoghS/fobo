import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { WeekShelf } from '@/components/WeekShelf';
import { dayAndTime, startTime, weekdayLong } from '@/lib/format';
import { asPlan, previewWeek, verdict, type Candidate } from '@/lib/weigh';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

const COPY = {
  over: (day: string) => ({ title: `${day} looks full`, sub: 'This may push you past your limit.' }),
  full: (day: string) => ({ title: `${day} is at your limit`, sub: 'It fits, with nothing to spare.' }),
  room: (day: string) => ({ title: `${day} has room`, sub: 'This fits under your limit.' }),
};

/** "7 PM" plus 90 minutes, for the shorter-visit suggestion. */
function leaveBy(start: string) {
  const d = new Date(start);
  d.setMinutes(d.getMinutes() + 90);
  const iso = `${start.slice(0, 11)}${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return startTime(iso);
}

/**
 * Weigh a plan, step two (Tory's mockups): the plan tried on its day. The new scrap flies in and
 * lands on the shelf, then the verdict, a suggestion and the actions arrive.
 */
export function WeighResult({ candidate, onBack, onClose }: { candidate: Candidate; onBack: () => void; onClose: () => void }) {
  const [landed, setLanded] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  const day = weekdayLong(candidate.start);
  const result = verdict(candidate);
  const copy = COPY[result](day);

  useEffect(() => {
    if (landed) Animated.timing(reveal, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [landed, reveal]);

  const rise = { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <IconButton icon="back" label="Back to plans" onPress={onBack} />
          <Text style={[type.bodyStrong, styles.ink]}>Weigh a plan</Text>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={`Change ${candidate.title}`} onPress={onBack} style={styles.summary}>
          <View style={styles.summaryText}>
            <Text style={[type.bodyStrong, styles.ink]}>{candidate.title}</Text>
            <Text style={[type.sub, styles.muted]}>
              {dayAndTime(candidate.start) + (candidate.with ? ` · ${candidate.with}` : '')}
            </Text>
          </View>
          <Icon name="pencil" size={20} color={color.ink2} />
        </Pressable>

        <View style={styles.card}>
          {landed ? (
            <Animated.View style={rise}>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[type.display, styles.ink]}>
                {copy.title}
              </Text>
              <Text style={[type.body, styles.muted, styles.sub]}>{copy.sub}</Text>
            </Animated.View>
          ) : (
            <View>
              <Text accessibilityRole="header" style={[type.display, styles.ink]}>{`Trying it on ${day}`}</Text>
              {/* Holds the verdict's second line so the shelf doesn't jump when it arrives. */}
              <Text style={[type.body, styles.sub, styles.hidden]} importantForAccessibility="no">
                {copy.sub}
              </Text>
            </View>
          )}

          <WeekShelf
            days={previewWeek(candidate, landed)}
            headroom={64}
            limitLabel="Your limit"
            separate={candidate.id}
            incoming={landed ? undefined : { date: candidate.start.slice(0, 10), plan: asPlan(candidate), onLanded: () => setLanded(true) }}
          />

          {!landed && <Text style={[type.foot, styles.muted, styles.center]}>Preview only</Text>}
          {landed && result === 'over' && (
            <Animated.View style={[styles.suggestion, rise]}>
              <View style={styles.suggestionIcon}>
                <Icon name="clock" size={22} />
              </View>
              <View style={styles.summaryText}>
                <Text style={[type.bodyStrong, styles.ink]}>Try a shorter visit</Text>
                <Text style={[type.sub, styles.muted]}>{`Leave by ${leaveBy(candidate.start)}`}</Text>
              </View>
              <Icon name="chevron" size={18} color={color.ink2} />
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {landed && (
        <Animated.View style={[styles.footer, rise]}>
          {/* Adding to the week isn't wired yet. Over the limit, the shorter visit above is the way to adjust. */}
          <Button label={result === 'room' ? 'Add to my week' : 'Add as planned'} trailingIcon="arrow" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: space[8], paddingHorizontal: space.margin, paddingBottom: space[28] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: {
    marginTop: space[16],
    padding: space[16],
    gap: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    backgroundColor: color.fill,
  },
  summaryText: { flex: 1, gap: space[4] },
  card: {
    marginTop: space[16],
    paddingTop: space[28],
    paddingHorizontal: space[20],
    paddingBottom: space[20],
    gap: space[8],
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
  sub: { paddingTop: space[4] },
  hidden: { opacity: 0 },
  suggestion: {
    marginTop: space[8],
    paddingTop: space[16],
    gap: space[16],
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: color.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, paddingBottom: space[16], gap: space[8] },
});
