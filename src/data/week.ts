/** The mock "now": Wednesday 7 October, mid-morning. Your week (439:2323) shows Wednesday as today. */
export let NOW = '2026-10-07T10:00';

/** Set by src/data/live.ts to the real local time when the week comes from the API. */
export function setNow(now: string) {
  NOW = now;
}

export const week = {
  start: '2026-10-05',
  end: '2026-10-11',
  /** "Time for you" on Your week. */
  personalHours: 2.5,
  /**
   * "Up next" on Your week. Figma shows this as its own row ("Social", "Tomorrow 11:30"),
   * and it doesn't match any plan in the Plans list, so it stays separate until design confirms.
   */
  upNext: { title: 'Social', when: 'Tomorrow 11:30' },
};
