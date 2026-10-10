export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
/** Demo week: Monday 5 October 2026. */
export const WEEK_DATES = [5, 6, 7, 8, 9, 10, 11]

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function fromMin(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** "19:30" → "7:30", "20:00" → "8", with an optional am/pm suffix. */
export function fmt(t: string, suffix = false): string {
  const min = toMin(t)
  const h24 = Math.floor(min / 60)
  const m = min % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const base = m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`
  return suffix ? `${base}${h24 < 12 ? 'am' : 'pm'}` : base
}

/** "4:00" style, always with minutes. */
export function clock(t: string): string {
  const min = toMin(t)
  const h24 = Math.floor(min / 60)
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(min % 60).padStart(2, '0')}`
}

export function hours(min: number): string {
  const h = min / 60
  if (h === Math.floor(h)) return `${h} hour${h === 1 ? '' : 's'}`
  if (h < 1) return `${min} minutes`
  return h === 1.5 ? 'an hour and a half' : `${h.toFixed(1)} hours`
}

export function dayName(day: number, today: number): string {
  if (day === today) return 'Today'
  if (day === today + 1) return 'Tomorrow'
  return DAYS[day]
}
