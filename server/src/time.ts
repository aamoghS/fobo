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
