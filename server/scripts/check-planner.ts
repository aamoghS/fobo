// One real call to the planner model with a small overloaded day. Costs one request.
//   node --env-file=../.env.local scripts/check-planner.ts
import { MODEL, askGemini } from '../src/planner.ts';

const started = Date.now();
const answer = await askGemini({
  now: '2030-01-14T08:00-05:00',
  timezone: 'America/New_York',
  profile: { recharge_style: 'alone', busy_streak: 2 },
  memories: [],
  plans: [
    { id: 'a', title: 'Work', category: 'work', cost: 5, starts_at: '2030-01-14T09:00-05:00', ends_at: '2030-01-14T17:00-05:00', with: [], protected: true },
    { id: 'b', title: 'Team dinner', category: 'social', cost: 4, starts_at: '2030-01-14T18:30-05:00', ends_at: '2030-01-14T21:00-05:00', with: ['Bea', 'Jun'], protected: false },
    { id: 'c', title: 'Gym', category: null, cost: null, starts_at: '2030-01-14T21:15-05:00', ends_at: '2030-01-14T22:15-05:00', with: [], protected: false },
  ],
});
console.log(`${MODEL} answered in ${Date.now() - started} ms`);
console.log(JSON.stringify(answer, null, 2));
