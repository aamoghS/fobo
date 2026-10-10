# Fobo Design System

Fobo (Fear of Burning Out) is a personal capacity planner. It helps people see how much energy their week costs, not just how much time it fills. Tone: warm, a little playful, never clinical.

Source of truth: Figma file `Ox8dcrF4xN8bbBtGFaZyqB`, page **✅ Final** (node `1:11`).
https://www.figma.com/design/Ox8dcrF4xN8bbBtGFaZyqB/Fobo?node-id=1-11

**Light mode only.** Dark mode was removed. Ignore the Light/Dark/Match System control on `Profile v.1`.

---

## 1. Principles

1. **Energy over time.** Every plan shows its cost (energy drops, "Costs 6 of 10"), not only its duration.
2. **Characters carry emotion.** Colorful blob creatures express state (sleepy, spent, celebrating). UI chrome stays neutral so they can.
3. **Black ink, warm paper.** Near-black primary actions on an off-white ground. Color comes from characters and a few tinted cards.
4. **Gentle copy.** "No wrong answer. It's a starting guess, not a label." Never shame, never alarm.
5. **One thumb.** Mobile-first, 393px frame, primary action pinned to the bottom.

---

## 2. Tokens

These variable names come straight from the Figma file. Use them as CSS custom properties. **If anything here conflicts with `DESIGN_SYSTEM.md` (pulled from the Design System page `1:6`), `DESIGN_SYSTEM.md` wins.** It adds Display/Time (68 Black) and Display/Hero (48 Bold), radius tokens `--r-chip 12 / --r-panel 26 / --r-sheet 34`, and `--shadow-lift` / `--shadow-paper`.

### Color: neutrals

| Token | Value | Use |
|---|---|---|
| `--ground` | `#FBFBF9` | App background |
| `--ground-alt` | `#FAFAF8` | Background on Your week |
| `--paper` | `#FFFFFF` | Cards, nav bar, text on ink |
| `--paper-2` | `#F3F3F1` | Inputs, radio rows, back button |
| `--fill` | `#F1F1EE` | Chips, icon buttons, date tiles, secondary button |
| `--ink` | `#141414` | Primary text, primary button, selected chip/tab |
| `--ink-strong` | `#0D0E0C` | Large headings on Your week |
| `--ink-2` | `#6A6A66` | Secondary text, captions, Skip |
| `--ink-3` | `#8C8C88` | Tertiary text, "or" divider, inactive progress |
| `--rule` | `rgba(20,20,20,0.08)` | List dividers, nav border |
| `--divider` | `#ECECE8` | Section dividers |
| `--sel-bg` / `--ground-deep` / `--accent` | `#141414` | Selected state fill |
| `--sel-ink` | `#FFFFFF` | Text on selected fill |

Aliases seen in Figma: `--ink-g` = `--ink`, `--ink-g2` = `--ink-2`.

### Color: signal, cut-paper palette, tints

Full values and node IDs live in `DESIGN_SYSTEM.md`; `tokens.css` has them ready to drop in.

- **Signal:** `--highlight #F5C125`, `--rest-dot #F7A6C9`, `--warn #FFC48A`
- **Scraps = kind of plan:** work `#2547D0`, social `#E8402A`, obligation `#E9A920`, enjoy `#1F9D6B`, rest `#F7A6C9`, past `#D9D9D4`
- **Characters = mood:** bright `#F5C125`, fine `#1F9D6B`, stretched `#E9A920`, spent `#E8402A`, asleep `#F7A6C9`
- **Creature ink:** `#1E1B18`
- **Screen tints (not in DS page, seen on screens):** peach `#FFE6DD` (social summary card), sky `#DBE9FF` (avatar ring)

Colour is reserved for paper creatures. Scrap colour means plan kind; character colour means mood. Never use these for buttons, chrome, or error states.

### Typography

Font: **DM Sans** (Google Fonts), optical size 14 (`font-variation-settings: "opsz" 14`). Chips in Figma use Inter Medium; treat that as an inconsistency and use DM Sans.

| Style | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| Hero | 40 / 50 | 700 | 0 | "Your week" |
| Page title | 36 / 39 | 700 | -1.44px | "Plans", "People" |
| Display | 34 / 1.08 | 700 | -1.02px | Onboarding and auth headlines |
| Stat | 28 / 36 | 700 | 0 (-0.84px on cards) | "3 plans left", "4 social plans" |
| Title | 22 / 28 | 700 | 0 | Section headers, date tile day |
| Item title | 18 / 21 | 700 | 0 | Plan names in lists |
| Body Strong | 17 / 23 | 700 | 0 | Buttons, row titles |
| Body | 17 / 23 | 500 | 0 | Subheads like "5–11 October" |
| Sub | 15 / 21 | 500 | 0 | Secondary lines, inputs, radio labels |
| Label | 13 / 18 | 700 | 0 | Field labels, Skip |
| Foot | 13 / 18 | 500 | 0 | Nav labels, weekday on date tile |

### Spacing

4px base. Common values: 4, 6, 8, 12, 16, 20, 24, 28, 40.
- Screen side padding: **20px** (Your week uses 15 + 6 inner)
- Screen top padding: **40px**, bottom CTA sits **40px** from bottom
- Section gap: 20 to 40px
- Field label to input: 8px; field to field: 12px

### Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 9px | Date tile |
| `--r-md` | 12px | Inputs, radio rows, progress segments |
| `--r-lg` | 16px | Summary cards |
| `--r-xl` | 18px | Week overview card |
| `--r-back` | 24px | Square-ish back button (54x54) |
| `--r-nav` | 43px | Bottom nav shell |
| `--r-full` | 999px | Buttons, chips, icon buttons, avatars |

### Elevation

| Token | Value | Use |
|---|---|---|
| `--shadow-soft` | `0 6px 20px rgba(20,20,20,0.07)` | Week overview card |
| `--shadow-nav` | `0 8px 12px rgba(0,0,0,0.10)` | Floating bottom nav |

---

## 3. Components

Figma component descriptions point to existing class names. Keep these names in code.

| Component | Figma | Code hint | Spec |
|---|---|---|---|
| Button | `34:965` | `.btn.ink` / `.btn.quiet` / `.btn.text` | Pill, h 54, px 28, Body Strong. `ink`: ink bg, white text. `quiet`: fill bg, ink text. `text`: no bg, ink-2 text with underlined ink link |
| Icon Button | `29:50` | `.circ` | 46 to 47px circle, fill bg, 22 to 24px icon |
| Back Button | in Button set | | 54x54, paper-2 bg, radius 24 |
| Chip | `34:1000` | `.chip[aria-pressed]` | h 36, px 14, radius full, Sub. Pressed: sel-bg + sel-ink |
| Insight Row / Plan row | `34:1016` | `.ins-row` | Date tile (52x62, fill, r 9) + title/time + energy drops, gap 18, bottom rule |
| Icon | `27:*` | `<Icon name="..." />` | 24px line icons: back, calendar, week, plans, people, you, plus, eye, chevron, bell, clock, scissors, pencil, refresh, bolt, home, snail, paper-airplane, box, cup |
| Bottom nav | `148:*` | | 370x64 floating pill, white, rule border, shadow-nav, r 43. Tabs: Week, Plans, People, You. Active tab: ink pill r 30, white icon and label |
| Text field | | | Label (Label style) + input (paper-2, r 12, px 12, py 16, Sub, ink-2 placeholder). Password has eye toggle |
| Radio row | | | paper-2, r 12, px 12, py 16, 25px circle + Sub label, gap 8 between rows |
| Answer card | | | 116x160 tile, character + title (Body Strong 15) + caption |
| Progress | | | 4 segments, h 5, r 12, gap 15. Done: ink. Todo: ink-3 |
| Energy drops | | | 1 to 3 teardrop glyphs, 11x16, right-aligned in plan rows |
| Character | | | Editable SVG blob: body + face + accessory layers. Shapes: Slab, Drip, Flower, Cloud, Square. Eyes: Sleepy, Happy, Bored |

---

## 4. Screens

Frames are 393x852 (iPhone 15/16). Node IDs for `get_design_context`.

### Pre-onboarding (section `368:8393`)
| Screen | Node |
|---|---|
| Splash | `360:7537` |
| Pre-login | `360:7057` |
| Sign up | `360:7306` |
| Login | `368:8126` |
| Forgot password | `368:8206` |

### Onboarding (section `368:10953`)
| Screen | Node |
|---|---|
| Start | `368:10954` |
| Q1 How you recharge (answer cards) | `378:11162` |
| Q2 When to head home (radio) | `378:11668` |
| Q3 Feel like yourself again (radio) | `378:11902` |
| Transition | `391:12326` |
| Energy comparison (pick which cost more) | `446:4427` |

### Main flow (section `391:12410`)
| Screen | Node |
|---|---|
| Your week (home) | `439:2323` |
| Plans · Social | `442:2461` |
| Event detail | `368:9064` |
| People | `387:1456` |
| People detail | `387:1613` |

### Loose frames (not in a ✅ section, confirm before building)
| Screen | Node |
|---|---|
| Profile v.1 (You tab) | `443:3735` |
| Capacity Profile | `443:3680` |
| Edit Character | `443:3590` |
| Settings | `443:3555` |
| Week chart component | `438:3482` |

---

## 5. Content and voice

- Sentence case everywhere except proper nouns. Buttons are short verbs: "Next", "Continue", "Plan my exit", "Move it".
- Energy is described in human terms: "Costs 6 of 10", "Fades after ~3 hrs", "Still fuel left in your tank."
- Insights reference real patterns: "Hackathons with Josh felt energizing 2 of 3 times."
- Always offer an out: Skip, "Can't remember", "About the Same".
- Known typos in Figma to fix in code: "Check availibility" → "Check availability", "Weight a plan" → confirm intent ("Weigh a plan"). Login/Forgot password email fields show "Enter your full name" placeholder; use "Enter your email".

---

## 6. Accessibility

- Minimum tap target 44px. Nav tabs, chips (36px tall) need 44px hit area via padding or pseudo-element.
- `--ink-2` on `--ground` passes AA for body text; `--ink-3` does not, so keep it for non-essential text only.
- Characters are decorative unless they convey state; when they do, add a text equivalent ("Feeling spent").
- Chips use `aria-pressed`; radio rows are real radio inputs in a `fieldset`.
- Respect `prefers-reduced-motion` for character animation.
