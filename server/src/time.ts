// DAY_ROOM: must match day_scores in db/migrations/009_frontend_shapes.sql and packages/core DAY_ROOM.
export const DAY_ROOM = 10;

// "2026-10-10T19:00-04:00": a local wall-clock time with its offset, readable by people and models.
export function localIso(d: Date, tz: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName.replace('GMT', '');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}${offset}`;
}

// Local calendar date ("2026-10-10") of an instant.
export function localDate(d: Date, tz: string): string {
  return localIso(d, tz).slice(0, 10);
}

export interface Costed {
  starts_at: string | Date;
  cost: number | null;
  declined?: boolean;
}

// A day's load is the sum of its plan costs, never below 0. A plan counts on the day it starts.
export function dayLoads(events: Costed[], tz: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    if (e.declined) continue;
    const day = localDate(new Date(e.starts_at), tz);
    out[day] = (out[day] ?? 0) + (e.cost ?? 0);
  }
  for (const k in out) out[k] = Math.max(0, out[k]);
  return out;
}

// Display strings in the app's style (src/data/*.ts), from local wall-clock strings
// ('2026-10-10T19:00'): '7:00' (12-hour, no suffix), 'Saturday', 'Tomorrow 11:30'.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function clock(local: string): string {
  const [h, m] = local.slice(11, 16).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}

export function weekday(local: string): string {
  const [y, mo, d] = local.slice(0, 10).split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}

// 'Today 4:00', 'Tomorrow 11:30' or 'Saturday 7:00', relative to today's local date.
export function when(local: string, today: string): string {
  const days = Math.round((Date.parse(local.slice(0, 10)) - Date.parse(today)) / 864e5);
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : weekday(local);
  return `${day} ${clock(local)}`;
}
