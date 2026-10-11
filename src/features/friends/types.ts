import { DAY_ROOM } from '@fobo/core/constants';

export type FriendDay = {
  date: string;
  busy: boolean;
  /** Null when they don't share their day load. */
  load: number | null;
  /** Their busy times, in their local time ('2026-10-05T09:00'); only when they share them. */
  blocks?: { start: string; end: string }[];
  sharedPlanTitles?: string[];
};

/** A friend's day past its room, like the API's `over`. */
export const isOver = (day: FriendDay) => day.load !== null && day.load > DAY_ROOM;
