// Fills the data modules in src/data/ from the Fobo API when signed in, so screens read real data
// through the same imports. Signed out (or the API unreachable), the mock data stays as it is.
import { saveCharacter, type Character } from '@/features/profile/character';
import type { Plan } from '@/features/plans/types';
import { api } from '@/lib/api';
import { refreshToday } from '@/lib/week';

import { people, type Person } from './people';
import { planDetails, plans, type PlanDetail } from './plans';
import { achievements, capacity, profile, widget, type Achievement } from './profile';
import { setNow, week } from './week';

type ApiPlan = Plan & { detail?: PlanDetail };
type ApiWeek = { start: string; end: string; personalHours: number; upNext: { title: string; when: string } | null };
type ApiProfile = {
  profile: { name: string; title: string | null; email: string | null; streak: typeof profile.streak };
  achievements: Achievement[];
  widget: { label: string; headline: string; next: string; nudge: string | null };
  capacity: typeof capacity;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function replace<T>(list: T[], items: T[]) {
  list.splice(0, list.length, ...items);
}

/** True when the app is showing the signed-in user's data. */
export async function loadLive(): Promise<boolean> {
  const me = await api<{ character: Character | null }>('GET', '/me');
  if (!me) return false;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const start = localDay(monday);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const [w, list, circle, you] = await Promise.all([
    api<ApiWeek>('GET', `/week?start=${start}`),
    api<ApiPlan[]>('GET', `/plans?from=${start}T00:00&to=${localDay(nextMonday)}T00:00`),
    api<Person[]>('GET', '/people'),
    api<ApiProfile>('GET', '/profile'),
  ]);

  setNow(`${localDay(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  refreshToday();
  if (w) {
    Object.assign(week, {
      start: w.start,
      end: w.end,
      personalHours: w.personalHours,
      upNext: w.upNext ?? { title: 'Nothing planned', when: '' },
    });
  }
  if (list) {
    replace(plans, list);
    for (const key of Object.keys(planDetails)) delete planDetails[key];
    for (const p of list) if (p.detail && Object.keys(p.detail).length) planDetails[p.id] = p.detail;
  }
  if (circle) replace(people, circle);
  if (you) {
    Object.assign(profile, {
      name: you.profile.name,
      title: you.profile.title ?? '',
      email: you.profile.email ?? '',
      streak: you.profile.streak,
    });
    replace(achievements, you.achievements);
    Object.assign(widget, { ...you.widget, nudge: you.widget.nudge ?? '' });
    replace(capacity, you.capacity);
  }
  if (me.character) saveCharacter(me.character, { remote: false });
  return true;
}
