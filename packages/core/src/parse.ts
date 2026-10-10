import type { CalEvent, Category } from './types'
import { DAYS, fromMin, toMin } from './time'

const RULES: [Category, RegExp][] = [
  ['rest', /\b(slow|rest|nap|quiet|protected|recharge|sabbath|nothing|lie[- ]in|me time)\b/i],
  ['enjoy', /\b(climb\w*|gym|yoga|run|hike|walk|swim|movie|film|read\w*|concert|gig|garden\w*|bake|paint\w*|pottery|class)\b/i],
  ['work', /\b(standup|stand-up|sync|review|planning|meeting|1:1|one on one|workshop|offsite|client|interview|retro|demo|deadline|presentation|all[- ]hands)\b/i],
  ['obligation', /\b(dentist|doctor|appointment|groceries|errand\w*|move|moving|taxes|dmv|repair|pick ?up|drop ?off|school|call with (mum|mom|dad))\b/i],
  ['social', /\b(dinner|drinks|brunch|lunch|party|birthday|wedding|coffee with|date|hang|catch ?up|bbq|game night)\b/i],
]

export function categorize(title: string): Category {
  return RULES.find(([, r]) => r.test(title))?.[0] ?? 'work'
}

/** First guess at cost from category and length. Always shown, always editable. */
export function guessCost(category: Category, startMin: number, endMin: number, title = ''): number {
  const h = Math.max(0.25, (endMin - startMin) / 60)
  if (category === 'rest') return 0
  if (category === 'enjoy') return 1
  const per = category === 'work' ? 0.9 : category === 'social' ? 1.3 : 1.1
  let c = Math.round(h * per)
  if (/\b(party|birthday|offsite|workshop|move|moving)\b/i.test(title)) c += 1
  return Math.max(1, Math.min(5, c))
}

function dayFrom(s: string): number | undefined {
  const i = DAYS.findIndex((d) => new RegExp(`\\b${d.slice(0, 3)}`, 'i').test(s))
  return i >= 0 ? i : undefined
}

function timeFrom(raw: string, ap?: string, hint = ''): number {
  const [hs, ms] = raw.split(':')
  let h = Number(hs)
  const m = Number(ms ?? 0)
  const a = ap?.toLowerCase()
  if (a === 'pm' && h < 12) h += 12
  if (a === 'am' && h === 12) h = 0
  if (!a && h < 8) h += 12
  if (!a && h < 12 && /dinner|drinks|party|evening|night/i.test(hint)) h += 12
  return h * 60 + m
}

let pasteId = 0

/**
 * Lines like "Thu 7pm dinner with Lea's parents", "Fri 9-5 team offsite",
 * "Saturday 10:00–13:00 help Theo move". Lines without a day are kept under the last day seen.
 */
export function parseNotes(text: string, source: CalEvent['source'] = 'paste'): CalEvent[] {
  const out: CalEvent[] = []
  let current = 0
  for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    const d = dayFrom(line)
    if (d !== undefined) current = d
    const range = line.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i)
    const single = line.match(/(?:at\s*)?\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b|\bat\s+(\d{1,2}(?::\d{2})?)/i)
    let start = 9 * 60
    let end = 10 * 60
    let title = line
    if (range) {
      start = timeFrom(range[1], range[2] ?? range[4], line)
      end = timeFrom(range[3], range[4], line)
      if (end <= start) end += 12 * 60
      title = line.replace(range[0], ' ')
    } else if (single) {
      start = timeFrom(single[1] ?? single[3], single[2], line)
      end = start + 90
      title = line.replace(single[0], ' ')
    } else if (d === undefined && !/\d/.test(line)) {
      // a bare title with no time: an all-evening plan
      start = 18 * 60
      end = 19 * 60 + 30
    }
    title = title
      .replace(new RegExp(`\\b(${DAYS.join('|')}|${DAYS.map((x) => x.slice(0, 3)).join('|')})\\b\\.?,?`, 'gi'), ' ')
      .replace(/^[\s,:\-–·]+|[\s,:\-–·]+$/g, '')
      .replace(/\s{2,}/g, ' ')
    if (!title) continue
    title = title.charAt(0).toUpperCase() + title.slice(1)
    const category = categorize(title)
    out.push({
      id: `${source}-${++pasteId}-${Date.now()}`,
      title,
      day: current,
      start: fromMin(start),
      end: fromMin(Math.min(end, 23 * 60 + 59)),
      category,
      cost: guessCost(category, start, end, title),
      source,
      protected: category === 'rest' ? true : undefined,
    })
  }
  return out
}

/** Minimal iCalendar reader: SUMMARY, DTSTART, DTEND. Events are placed on their weekday in the demo week. */
export function parseICS(text: string): CalEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1)
  const out: CalEvent[] = []
  for (const b of blocks) {
    const get = (k: string) => b.match(new RegExp(`^${k}[^:\\n]*:(.*)$`, 'm'))?.[1]?.trim()
    const summary = get('SUMMARY')?.replace(/\\,/g, ',').replace(/\\n/g, ' ')
    const ds = get('DTSTART')
    if (!summary || !ds) continue
    const de = get('DTEND') ?? ds
    const at = (v: string) => {
      const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/)
      if (!m) return undefined
      const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      const weekday = (date.getDay() + 6) % 7
      const min = m[4] ? Number(m[4]) * 60 + Number(m[5]) : 9 * 60
      return { weekday, min }
    }
    const s = at(ds)
    const e = at(de)
    if (!s) continue
    const endMin = e && e.min > s.min ? e.min : s.min + 60
    const category = categorize(summary)
    out.push({
      id: `ics-${++pasteId}-${Date.now()}`,
      title: summary,
      day: s.weekday,
      start: fromMin(s.min),
      end: fromMin(endMin),
      category,
      cost: guessCost(category, s.min, endMin, summary),
      source: 'ics',
      protected: category === 'rest' ? true : undefined,
    })
  }
  return out.sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start))
}

export const SAMPLE_NOTES = `Mon 10-11:30 sprint planning
Mon 2pm 1:1 with Hana
Tue 10am-1pm client workshop
Tue 4:30pm dentist
Wed 4-5pm design review
Wed 6:30pm climbing with Jun
Thu 9-3 quarterly planning
Thu 7pm dinner with Lea's parents
Fri 9-5 team offsite
Fri 5:30pm offsite drinks
Sat 10am-1pm help Theo move
Sat 1:30pm Ava's birthday brunch
Sun 8-10:30am slow morning`

export const LABEL: Record<Category, string> = {
  work: 'Work',
  social: 'Social',
  obligation: 'Personal obligation',
  rest: 'Rest or recovery',
  enjoy: 'Enjoyable',
}
