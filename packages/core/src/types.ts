export type Category = 'work' | 'social' | 'obligation' | 'rest' | 'enjoy'

export type Mood = 'bright' | 'fine' | 'stretched' | 'spent' | 'asleep'

export type Wash = 'past' | 'today' | 'next' | 'over'

export type Transport = 'walk' | 'ride' | 'friend'

export interface ExitPlan {
  leaveAt: string // "20:30"
  remind: boolean
  transport: Transport
  message: string
  protectAfter: boolean
}

export interface CalEvent {
  id: string
  title: string
  day: number // 0 = Monday … 6 = Sunday, in the demo week
  start: string // "HH:MM"
  end: string
  category: Category
  cost: number // energy units, 0–5; rest blocks are 0 or -1 (they give back)
  with?: string[]
  kind?: string // dinner, drinks… used to learn from check-ins
  protected?: boolean
  source: 'calendar' | 'ics' | 'paste' | 'manual' | 'fobo'
  plan?: ExitPlan
}

export type SocialStyle = 'introvert' | 'ambivert' | 'extrovert'
export type Recovery = 'hours' | 'half' | 'day' | 'two'

export interface Profile {
  style: SocialStyle
  batteryHours: number
  aloneHours: number
  busyStreak: number
  recovery: Recovery
  refills: string[]
  drains: string[]
  protectedHours: number
}

export type Feel = 'energizing' | 'neutral' | 'draining'

/** One remembered outcome: how a kind of plan with a person felt. */
export interface Memory {
  kind: string
  person: string
  feel: Feel
  worth: boolean
}

export interface CheckIn {
  eventId: string
  feel: Feel
  worth: boolean
  before: number // estimated cost before learning
  after: number // estimated cost after learning
}

export type Choice = 'accept' | 'boundaries' | 'suggest' | 'decline'

export type Eyes = 'round' | 'happy' | 'sleepy' | 'sideways'

export interface Me {
  name: string
  shape: Mood // the silhouettes are the mood shapes: flower, blob, slab, drip, cloud
  color: string
  eyes: Eyes
  height: number // 0 (short) … 100 (tall)
}

export interface Clock {
  day: number
  time: string
}

export interface AppState {
  version: number
  onboarded: boolean
  imported: boolean
  profile: Profile
  events: CalEvent[]
  memories: Memory[]
  checkIns: CheckIn[]
  now: Clock
  theme: 'auto' | 'light' | 'dark'
  demo: { analyzed: boolean; planned: boolean; previewed: boolean }
  /** your own character, made in You > Edit character */
  me: Me
  /** achievement ids pinned to You (up to three) */
  pinned: string[]
  /** contacts you've invited to Fobo */
  invited: string[]
  /** close friends who can see when you have room (never your plans) */
  share: { on: boolean; with: string[] }
}
