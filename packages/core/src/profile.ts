import type { Profile, Recovery, SocialStyle } from './types'

export const STYLES: { id: SocialStyle; label: string; hint: string }[] = [
  { id: 'introvert', label: 'Mostly alone', hint: 'Quiet refills me' },
  { id: 'ambivert', label: 'It depends', hint: 'A bit of both' },
  { id: 'extrovert', label: 'With people', hint: 'Company refills me' },
]
export const RECOVERY: { id: Recovery; label: string }[] = [
  { id: 'hours', label: 'A few hours' }, { id: 'half', label: 'Half a day' }, { id: 'day', label: 'A full day' }, { id: 'two', label: 'Two days or more' },
]

export function describe(p: Profile) {
  return {
    style: STYLES.find((s) => s.id === p.style)!.label === 'It depends' ? 'Recharges both ways' : p.style === 'introvert' ? 'Recharges alone' : 'Recharges with people',
    battery: `Group energy fades after about ${p.batteryHours} hour${p.batteryHours === 1 ? '' : 's'}`,
    alone: `${p.aloneHours < 1 ? '30 minutes' : `${p.aloneHours} hour${p.aloneHours === 1 ? '' : 's'}`} alone, most days`,
    streak: `${p.busyStreak} busy day${p.busyStreak === 1 ? '' : 's'} in a row feels fine`,
    recovery: `${RECOVERY.find((r) => r.id === p.recovery)!.label} to recover from a big one`,
    refills: p.refills.length ? p.refills.join(', ') : 'Nothing picked yet',
    drains: p.drains.length ? p.drains.join(', ') : 'Nothing picked yet',
    protect: `${p.protectedHours} hours a week kept for you`,
  }
}
