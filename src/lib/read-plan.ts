import { NOW } from '@/data/week';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export type ReadPlan = {
  /** Names after "with", in order. */
  people: string[];
  /** ISO start, when a day and/or time could be read. */
  start?: string;
};

/**
 * Reads who and when out of a typed plan or pasted invite:
 * "Dinner at Comal on Saturday at 7 PM with Dani, Mara and Jonah."
 * Light by design: weekdays, today/tomorrow, and "7 PM" / "7:30pm" times.
 */
export function readPlan(text: string): ReadPlan {
  const withMatch = text.match(/\bwith\s+(.+?)(?:[.!?]|$|\s+(?:on|at|this|next|tomorrow|today)\b)/i);
  const people = withMatch
    ? withMatch[1]
        .split(/,|\band\b|&/i)
        .map((n) => n.trim())
        .filter(Boolean)
    : [];

  const now = new Date(NOW);
  let day: Date | undefined;
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) day = addDays(now, 1);
  else if (/\btoday\b|\btonight\b/.test(lower)) day = now;
  else {
    const i = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(lower));
    if (i >= 0) day = addDays(now, (i - now.getDay() + 7) % 7 || 7);
  }

  const time = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!day && !time) return { people };
  const d = new Date(day ?? now);
  if (time) {
    const h = Number(time[1]) % 12 + (time[3].toLowerCase() === 'pm' ? 12 : 0);
    d.setHours(h, Number(time[2] ?? 0), 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { people, start };
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
