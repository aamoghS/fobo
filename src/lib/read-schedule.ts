export type ReadLine = { title: string; start: string; end: string };

const DAYS: [RegExp, number][] = [
  [/\bsun(?:day)?\b/i, 0],
  [/\bmon(?:day)?\b/i, 1],
  [/\btue(?:s|sday)?\b/i, 2],
  [/\bwed(?:nesday)?\b/i, 3],
  [/\bthu(?:r|rs|rsday)?\b/i, 4],
  [/\bfri(?:day)?\b/i, 5],
  [/\bsat(?:urday)?\b/i, 6],
];

// "9-5", "10am-1pm", "7:30 to 9pm" (hyphen, en or em dash, or "to").
const RANGE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
// A lone time needs am/pm, so "3 friends" isn't read as 3 o'clock.
const AT = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

/** A clock hour from 1-12 and am/pm, or a guess without one: 8 to 11 is morning, 12 to 7 is afternoon or evening. */
function hour(h: number, half?: string) {
  if (h > 12) return h;
  if (half) return (h % 12) + (half.toLowerCase() === 'pm' ? 12 : 0);
  return h >= 8 && h <= 11 ? h : (h % 12) + 12;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Reads plans out of pasted notes, one per line: "Thu 7pm dinner with Lea's parents", "Fri 9-5 team
 * offsite", "Sat 10am-1pm help Theo move". A day (a weekday, today or tomorrow) and a time are needed;
 * a lone time runs an hour. Days are the next one coming, today included. Lines it can't read are
 * handed back as they were.
 */
export function readSchedule(text: string, now = new Date()): { plans: ReadLine[]; unread: string[] } {
  const plans: ReadLine[] = [];
  const unread: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let rest = line;

    let day: Date | undefined;
    if (/\btomorrow\b/i.test(rest)) {
      day = new Date(now);
      day.setDate(now.getDate() + 1);
      rest = rest.replace(/\btomorrow\b/i, ' ');
    } else if (/\b(today|tonight)\b/i.test(rest)) {
      day = new Date(now);
      rest = rest.replace(/\b(today|tonight)\b/i, ' ');
    } else {
      const found = DAYS.find(([re]) => re.test(rest));
      if (found) {
        day = new Date(now);
        day.setDate(now.getDate() + ((found[1] - now.getDay() + 7) % 7));
        rest = rest.replace(found[0], ' ');
      }
    }

    let from: number | undefined;
    let to: number | undefined;
    const range = rest.match(RANGE);
    if (range) {
      const [, h1, m1, a1, h2, m2, a2] = range;
      let startH = hour(Number(h1), a1 ?? a2);
      let endH = hour(Number(h2), a2);
      // "10-1pm": a start that borrowed the end's pm and landed after it was the morning.
      if (!a1 && a2 && startH > endH) startH -= 12;
      // "7pm-9": an end that comes out before the start is later the same evening.
      if (!a2 && endH <= startH && endH < 12) endH += 12;
      from = startH * 60 + Number(m1 ?? 0);
      to = endH * 60 + Number(m2 ?? 0);
      rest = rest.replace(range[0], ' ');
    } else {
      const at = rest.match(AT);
      if (at) {
        from = hour(Number(at[1]), at[3]) * 60 + Number(at[2] ?? 0);
        to = from + 60;
        rest = rest.replace(at[0], ' ');
      }
    }

    const title = rest
      .replace(/\s+/g, ' ')
      .replace(/^[\s,:;·•*-]+|[\s,:;·•*-]+$/g, '')
      .trim();
    if (!day || from === undefined || to === undefined || !title) {
      unread.push(line);
      continue;
    }
    const date = localDay(day);
    // Past midnight ends the next day.
    const endDay = new Date(day);
    if (to <= from) endDay.setDate(endDay.getDate() + 1);
    const at = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
    plans.push({
      title: title[0].toUpperCase() + title.slice(1),
      start: `${date}T${at(from)}`,
      end: `${localDay(endDay)}T${at(to)}`,
    });
  }
  return { plans, unread };
}
