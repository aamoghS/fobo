import type { CalEvent, Clock, Mood, Profile, Wash } from './types'
import { DAYS, clock, toMin } from './time'
import { DAY_ROOM, FULL_DAY } from './constants'

// Every day has the same room. Profiles change what costs what, never how much room a person
// "deserves". The values live in ./constants, which the API server imports too.
export { DAY_ROOM, FULL_DAY }

export function dayEvents(events: CalEvent[], day: number): CalEvent[] {
  return events.filter((e) => e.day === day).sort((a, b) => toMin(a.start) - toMin(b.start))
}

export function dayLoad(events: CalEvent[], day: number): number {
  return Math.max(0, events.filter((e) => e.day === day).reduce((s, e) => s + e.cost, 0))
}

export function loads(events: CalEvent[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => dayLoad(events, d))
}

export function weekBudget(p: Profile): number {
  return DAY_ROOM * 7 - p.protectedHours
}

/** Runs of consecutive full days, as [startDay, endDay]. */
export function fullRuns(ls: number[]): [number, number][] {
  const runs: [number, number][] = []
  let start = -1
  ls.forEach((l, i) => {
    if (l >= FULL_DAY && start < 0) start = i
    if ((l < FULL_DAY || i === ls.length - 1) && start >= 0) {
      runs.push([start, l >= FULL_DAY ? i : i - 1])
      start = -1
    }
  })
  return runs
}

/** Position of a day inside its run of full days (1-based), 0 if not full. */
function runPosition(ls: number[], day: number): number {
  for (const [a, b] of fullRuns(ls)) if (day >= a && day <= b) return day - a + 1
  return 0
}

const ORDER: Mood[] = ['bright', 'fine', 'stretched', 'spent']

function hasRefill(events: CalEvent[], day: number, p: Profile): boolean {
  return events.some((e) => e.day === day && (e.category === 'enjoy' || e.category === 'rest') && e.cost <= 1 && (e.category === 'rest' || p.refills.length > 0))
}

/** How a day will probably feel, given its load, its neighbours and the profile. */
export function moodFor(events: CalEvent[], ls: number[], day: number, p: Profile): Mood {
  const l = ls[day]
  const rest = events.some((e) => e.day === day && e.category === 'rest')
  if (l <= 2 && rest) return 'asleep'
  if (l > DAY_ROOM) return 'spent'
  let i = l <= 4 ? 0 : l <= 7 ? 1 : 2
  if (runPosition(ls, day) > p.busyStreak) i += 1
  if (hasRefill(events, day, p) && l < FULL_DAY) i -= 1
  return ORDER[Math.max(0, Math.min(3, i))]
}

export function washFor(day: number, now: Clock, load: number): Wash {
  if (day < now.day) return 'past'
  if (day === now.day) return 'today'
  return load > DAY_ROOM ? 'over' : 'next'
}

export const MOOD_WORD: Record<Mood, string> = {
  bright: 'likely to feel good',
  fine: 'likely to feel fine',
  stretched: 'likely to feel stretched',
  spent: 'likely to feel spent',
  asleep: 'a rest day',
}

export interface Insight {
  id: string
  tone: 'warn' | 'rest' | 'info'
  text: string // full sentence, for screen readers and widgets
  title: string // what the eye reads first, four words or so
  detail?: string
  action?: { label: string; kind: 'rest-tonight' | 'see-day'; day?: number }
}

export interface WeekSummary {
  loads: number[]
  committed: number
  budget: number
  left: number
  todayLeft: number
  headline: string
  sub: string
  next?: CalEvent
  insights: Insight[]
  heavyDays: number[]
  protectedHours: number
}

function list(days: number[]): string {
  const names = days.map((d) => DAYS[d])
  if (names.length <= 2) return names.join(' and ')
  return `${names[0]} to ${names[names.length - 1]}`
}

export function summarize(events: CalEvent[], p: Profile, now: Clock): WeekSummary {
  const ls = loads(events)
  const committed = ls.reduce((a, b) => a + b, 0)
  const budget = weekBudget(p)
  const left = Math.max(0, budget - committed)
  const todayLeft = Math.max(0, DAY_ROOM - ls[now.day])
  const upcoming = ls.map((l, d) => ({ l, d })).filter(({ d }) => d >= now.day)
  const heavyDays = upcoming.filter(({ l }) => l >= FULL_DAY).map(({ d }) => d)
  const over = upcoming.filter(({ l }) => l > DAY_ROOM).map(({ d }) => d)
  const runs = fullRuns(ls).filter(([a, b]) => b >= now.day && b - a + 1 > p.busyStreak)

  const nowMin = toMin(now.time)
  const next = events
    .filter((e) => e.category !== 'rest' && (e.day > now.day || (e.day === now.day && toMin(e.start) >= nowMin)))
    .sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start))[0]

  const protectedMin = events.filter((e) => e.protected).reduce((s, e) => s + toMin(e.end) - toMin(e.start), 0)
  const protectedHours = Math.round(protectedMin / 30) / 2

  let headline = 'You still have room for what matters.'
  if (over.length) headline = `${DAYS[over[0]]} is over the line.`
  else if (runs.length) headline = `${DAYS[runs[0][1]]} is carrying a lot.`
  else if (left < 6) headline = 'Your plans fit. Your recovery needs attention.'
  else if (heavyDays.length === 0) headline = 'Plenty of room. Spend it on purpose.'

  const restDay = events.find((e) => e.protected && e.day >= now.day)
  const sub = restDay || protectedHours ? `${protectedHours} h kept for you` : 'nothing protected yet'

  const insights: Insight[] = []
  for (const [a, b] of runs) {
    const n = b - a + 1
    insights.push({
      id: `run-${a}`,
      tone: 'warn',
      text: `${list(range(a, b))} ${n === 2 ? 'are two' : `are ${words(n)}`} full days in a row. You’re comfortable with ${words(p.busyStreak)}.`,
      title: `${capital(words(n))} full days in a row`,
      detail: `${DAYS[a].slice(0, 3)}–${DAYS[b].slice(0, 3)} · you’re comfy with ${words(p.busyStreak)}`,
      action: { label: `See ${DAYS[b]}`, kind: 'see-day', day: b },
    })
  }
  for (const d of over) {
    insights.push({ id: `over-${d}`, tone: 'warn', text: `${DAYS[d]} asks for ${ls[d]} of ${DAY_ROOM}. Something could move or get shorter.`, title: `${DAYS[d]} is over the line`, detail: `${ls[d]} of ${DAY_ROOM} · something could move`, action: { label: `See ${DAYS[d]}`, kind: 'see-day', day: d } })
  }

  // protected personal time this week
  const kept = events.filter((e) => e.protected && e.day >= now.day).sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start))
  if (kept.length) {
    const k = kept[0]
    const ampm = (t: string) => (toMin(t) < 12 * 60 ? 'am' : 'pm')
    const span = `${clock(k.start).replace(':00', '')}${ampm(k.start) === ampm(k.end) ? '' : ampm(k.start)}–${clock(k.end).replace(':00', '')}${ampm(k.end)}`
    insights.push({
      id: 'protected',
      tone: 'info',
      text: `${protectedHours} of your ${p.protectedHours} protected hours are set, starting ${DAYS[k.day]} ${span}. Plans won’t land there.`,
      title: `${DAYS[k.day]} ${span} is yours`,
      detail: `${protectedHours} of ${p.protectedHours} protected hours set`,
    })
  }

  // a recovery opening tonight
  const todays = dayEvents(events, now.day)
  const lastEnd = todays.reduce((m, e) => Math.max(m, toMin(e.end)), 0)
  const restTonight = todays.some((e) => e.category === 'rest' && toMin(e.start) >= 18 * 60)
  const freeFrom = Math.max(lastEnd, 18 * 60, nowMin)
  if (!restTonight && freeFrom <= 21 * 60) {
    const nextHeavy = heavyDays.find((d) => d > now.day)
    const after = clock(`${Math.floor(freeFrom / 60)}:${String(freeFrom % 60).padStart(2, '0')}`)
    insights.push({
      id: 'tonight',
      tone: 'rest',
      text: `Tonight after ${after.replace(':00', '')} is open.${nextHeavy !== undefined ? ` A slow evening would help ${DAYS[nextHeavy]}.` : ' Nothing is asking for it.'}`,
      title: `Free tonight after ${after.replace(':00', '')}`,
      detail: nextHeavy !== undefined ? `A slow evening helps ${DAYS[nextHeavy]}` : 'Nothing is asking for it',
      action: { label: 'Rest tonight', kind: 'rest-tonight' },
    })
  } else if (restTonight) {
    insights.push({ id: 'tonight-kept', tone: 'rest', text: 'Tonight is kept slow. Tomorrow starts with a little more room.', title: 'Tonight is kept slow', detail: 'Tomorrow starts with more room' })
  }

  return { loads: ls, committed, budget, left, todayLeft, headline, sub, next, insights, heavyDays, protectedHours }
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}

export function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function words(n: number): string {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][n] ?? String(n)
}
