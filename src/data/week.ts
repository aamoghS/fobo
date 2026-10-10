import { NOTHING_PLANNED } from '@fobo/core/copy';

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-07" in the phone's timezone. */
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-10-07T10:00" in the phone's timezone. */
export const localNow = (d = new Date()) => `${localDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** The Monday that starts the week holding `d`. */
export function mondayOf(d = new Date()) {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday;
}

/** Now, as local wall-clock time. src/data/live.ts updates it on every load. */
export let NOW = localNow();

export function setNow(now: string) {
  NOW = now;
}

function thisWeek() {
  const monday = mondayOf();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: localDay(monday), end: localDay(sunday) };
}

export const NO_NEXT = { title: NOTHING_PLANNED, when: '' };

/** Your week (439:2323), filled from the API by src/data/live.ts. */
export const week = {
  ...thisWeek(),
  /** "Time for you" on Your week. */
  personalHours: 0,
  /** "Up next" on Your week: the next plan from now. */
  upNext: NO_NEXT as { id?: string; title: string; when: string; kind?: string },
};

/** This week with nothing in it (signed out). */
export function resetWeek() {
  Object.assign(week, thisWeek(), { personalHours: 0, upNext: NO_NEXT });
  setNow(localNow());
}
