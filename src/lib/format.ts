// Date and time strings in the formats the Final screens use.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00` : iso);

export const weekdayLong = (iso: string) => WEEKDAYS[toDate(iso).getDay()];

/** "M", "T", "W" for the week shelf. */
export const weekdayInitial = (iso: string) => weekdayLong(iso)[0];

/** "THU" and "8" for the plan row date tile. */
export const dateTile = (iso: string) => {
  const d = toDate(iso);
  return { weekday: WEEKDAYS[d.getDay()].slice(0, 3).toUpperCase(), day: String(d.getDate()) };
};

/** "5–11 October" (or "28 September–4 October" across months). */
export function weekRange(start: string, end: string) {
  const a = toDate(start);
  const b = toDate(end);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

const clock = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`;
};
const period = (d: Date) => (d.getHours() < 12 ? 'am' : 'pm');

/** Plan list style: "7–9:30pm", "11am–1pm". */
export function timeRange(start: string, end: string) {
  const a = toDate(start);
  const b = toDate(end);
  const same = period(a) === period(b);
  return `${clock(a)}${same ? '' : period(a)}–${clock(b)}${period(b)}`;
}

/** Event detail style, as drawn in Figma: "Friday, 9 October · 7—11 AM". */
export function eventDateLine(start: string, end: string) {
  const a = toDate(start);
  const b = toDate(end);
  const same = period(a) === period(b);
  const range = same
    ? `${clock(a)}—${clock(b)} ${period(b).toUpperCase()}`
    : `${clock(a)} ${period(a).toUpperCase()}—${clock(b)} ${period(b).toUpperCase()}`;
  return `${weekdayLong(start)}, ${a.getDate()} ${MONTHS[a.getMonth()]} · ${range}`;
}

/** "2.5h" */
export const hours = (h: number) => `${h}h`;

export const isoDay = (iso: string) => iso.slice(0, 10);

export function daysBetween(start: string, end: string) {
  const days: string[] = [];
  for (let d = toDate(start); d <= toDate(end); d.setDate(d.getDate() + 1)) {
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

const SHORT_MONTH = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);

/** People card: "Sat, 7 PM". */
export function dayAndHour(iso: string) {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${clock(d)} ${period(d).toUpperCase()}`;
}

/** People detail rows: "Sat, Oct 10 · 7–8:30 PM". */
export function shortDateRange(start: string, end: string) {
  const a = toDate(start);
  const b = toDate(end);
  const same = period(a) === period(b);
  const range = `${clock(a)}${same ? '' : ` ${period(a).toUpperCase()}`}–${clock(b)} ${period(b).toUpperCase()}`;
  return `${WEEKDAYS[a.getDay()].slice(0, 3)}, ${SHORT_MONTH(a)} ${a.getDate()} · ${range}`;
}

/** Weigh a plan day headings: "Saturday, Oct 10". */
export function dayHeading(iso: string) {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${SHORT_MONTH(d)} ${d.getDate()}`;
}

/** Weigh a plan rows: "7 PM", "10 AM", "7:30 PM". */
export function startTime(iso: string) {
  const d = toDate(iso);
  return `${clock(d)} ${period(d).toUpperCase()}`;
}

/** Write a plan: "Sat, Oct 10 · 7 PM". */
export function dayAndTime(iso: string) {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${SHORT_MONTH(d)} ${d.getDate()} · ${clock(d)} ${period(d).toUpperCase()}`;
}
