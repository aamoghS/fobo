export type PlanStatus = 'proposed' | 'accepted' | 'moved' | 'declined';

export type Plan = {
  id: string;
  title: string;
  start: string;
  end: string;
  energyCost: number;
  status: PlanStatus;
  shared: boolean;
};
