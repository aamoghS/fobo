export type PlanStatus = 'proposed' | 'accepted' | 'moved' | 'declined';

/** Scrap colour and top cut. Maps onto events.category. */
export type PlanKind = 'work' | 'social' | 'obligation' | 'enjoy' | 'rest';

export type Plan = {
  id: string;
  title: string;
  kind: PlanKind;
  start: string;
  end: string;
  /** Out of DAY_ROOM (10). */
  energyCost: number;
  status: PlanStatus;
  shared: boolean;
  /** "Leave by" time, e.g. "8:30". */
  leaveBy?: string;
  /** People ids, host first. */
  with?: string[];
  /** Line icon on People detail rows; box when unset. */
  icon?: 'box' | 'cup';
  /** Where it came from: Google Calendar, or made in Fobo. */
  source?: 'google' | 'capacity';
};
