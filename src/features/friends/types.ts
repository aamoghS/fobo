import { DAY_ROOM } from '@fobo/core/constants';

export type FriendDay = {
  date: string;
  busy: boolean;
  load: number;
  sharedPlanTitles?: string[];
};

/** A friend's day past its room, like the API's `over`. */
export const isOver = (day: FriendDay) => day.load > DAY_ROOM;
