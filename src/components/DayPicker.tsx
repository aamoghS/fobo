import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { localDay } from '@/data/week';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { IconButton } from './IconButton';
import { Pressable } from './Pressable';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Weeks start on Monday, like Your week.
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A month of days to pick one from. `value` and `onChange` are YYYY-MM-DD. */
export function DayPicker({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const today = localDay(new Date());
  const [month, setMonth] = useState(() => {
    const d = new Date(`${value}T00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  // Blank cells before the 1st, so it lands under its weekday.
  const lead = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.picker}>
      <View style={styles.head}>
        <IconButton icon="back" label="Previous month" size={44} iconSize={20} onPress={() => shift(-1)} />
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>{`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}</Text>
        <IconButton icon="chevron" label="Next month" size={44} iconSize={20} onPress={() => shift(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[type.foot, styles.muted, styles.cell, styles.center]}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((d, j) => {
            if (!d) return <View key={j} style={styles.cell} />;
            const iso = localDay(d);
            const on = iso === value;
            return (
              <View key={j} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${iso === today ? ', today' : ''}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => onChange(iso)}
                  style={[styles.day, iso === today && styles.today, on && styles.on]}>
                  <Text style={[type.subStrong, on ? styles.onText : styles.ink]}>{d.getDate()}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  day: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: color.ink },
  on: { backgroundColor: color.selBg },
  onText: { color: color.selInk },
});
