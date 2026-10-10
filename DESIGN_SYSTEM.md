# Fobo Design System: Figma pull map

Where Claude Code pulls every token, component, icon, character and illustration from.

- **File key:** `Ox8dcrF4xN8bbBtGFaZyqB`
- **Design System page:** `1:6` (🎨 Design System). Tokens, components, icons, characters.
- **Final screens page:** `1:11` (✅ Final). Scene illustrations and screens.
- URL: https://www.figma.com/design/Ox8dcrF4xN8bbBtGFaZyqB/Fobo?node-id=1-6

The idea, from the file header: *A calendar shows when you're free. Fobo shows when you're full.* Paper cut-out look. Warm white ground, black ink, soft grey rows, black pill buttons. **Colour is reserved for the paper creatures, and every colour means something.**

> The Figma file defines Light and Dark modes. The app ships **Light only**. Pull Light values; ignore Dark.

---

## How to pull

| Need | Tool | Node |
|---|---|---|
| Token values | `get_variable_defs` | `34:397` (color), `34:632` (space, radius, shadow), `34:818` (creatures) |
| Component code + assets | `get_design_context` (load figma-design-to-code skill first) | component set IDs below |
| Visual check | `get_screenshot` | any node below |
| SVG files | download from the asset URLs `get_design_context` returns (they expire in 7 days, so save them locally right away) | |

Save assets to:
```
src/assets/icons/<name>.svg
src/assets/characters/<mood>.svg
src/assets/scraps/<kind>.svg
src/assets/illustrations/<scene>.svg
```

---

## 1. Color (`34:397`)

### Surfaces and ink (Light)
| Token | Hex |
|---|---|
| `--ground` | `#FBFBF9` |
| `--paper` | `#FFFFFF` |
| `--paper-2` | `#F3F3F1` |
| `--fill` | `#F1F1EE` |
| `--rule` | `#141414` at 8% (`#14141414`) |
| `--ink` | `#141414` |
| `--ink-2` | `#6A6A66` |
| `--ink-3` | `#8C8C88` |
| `--sel-bg` | `#141414` |
| `--sel-ink` | `#FFFFFF` |

### Signal
| Token | Hex | Use |
|---|---|---|
| `--highlight` | `#F5C125` | Highlight, streak, sunshine |
| `--rest-dot` | `#F7A6C9` | Rest marker |
| `--warn` | `#FFC48A` | Gentle warning (never red) |

### Cut-paper palette: the only colour in the app
**Scraps = kind of plan** (`--scrap-*`)
| Kind | Hex | Top cut |
|---|---|---|
| Work | `#2547D0` | Snipped corner |
| Social | `#E8402A` | Wavy |
| Obligation | `#E9A920` | Pinking shears (zigzag) |
| Enjoy | `#1F9D6B` | Scallops |
| Rest | `#F7A6C9` | Cloud cushion |
| Past | `#D9D9D4` | Kraft grey, asleep |

**Characters = mood** (`--mood-*`)
| Mood | Hex |
|---|---|
| Bright | `#F5C125` |
| Fine | `#1F9D6B` |
| Stretched | `#E9A920` |
| Spent | `#E8402A` |
| Asleep | `#F7A6C9` |

`--creature-ink`: `#1E1B18` (eyes and faces).

Rule: scrap colour means plan kind, character colour means mood. Never use these for UI chrome, buttons, or error states.

---

## 2. Typography (`34:582`, ramp `34:586`)

DM Sans, `font-variation-settings: "opsz" 14`. Bold for headlines and labels, Medium for reading text. Headlines tight.

| Style | Weight | Size / Line | Tracking |
|---|---|---|---|
| Display/Time | Black 900 | 68 / 1 | -2.4px |
| Display/Hero | Bold 700 | 48 / 1 | -1.6px |
| Display/Display | Bold 700 | 34 / 1.08 | -1.02px |
| Title/Title | Bold 700 | 22 / 28 | 0 |
| Body/Body | Medium 500 | 17 / 23 | 0 |
| Body/Body Strong | Bold 700 | 17 / 23 | 0 |
| Body/Sub | Medium 500 | 15 / 21 | 0 |
| Body/Sub Strong | Bold 700 | 15 / 21 | 0 |
| Small/Label | Bold 700 | 13 / 18 | 0 |
| Small/Foot | Medium 500 | 13 / 18 | 0 |

Figma stores tracking as a percent; the px values above are what renders.

---

## 3. Space, shape, depth (`34:632`)

Rhythm: 8 / 16 / 28 inside screens, 20 side margin.

| Spacing | px | Radius | px | Shadow | Value |
|---|---|---|---|---|---|
| `--space-4` | 4 | `--r-chip` | 12 | `--shadow-soft` | `0 6px 20px rgba(20,20,20,0.07)` tab bar, toasts, composer |
| `--space-8` | 8 | `--r-row` | 18 | `--shadow-lift` | `0 10px 30px rgba(15,28,80,0.18)` lifted sheets |
| `--space-12` | 12 | `--r-panel` | 26 | `--shadow-paper` | `0 2px 0 rgba(20,20,20,0.10)` every creature and scrap |
| `--space-20` | 20 | `--r-sheet` | 34 | | |
| `--space-32` | 32 | `--r-full` | 999 | | |
| `--space-48` | 48 | | | | |

`--r-row` (18) comes from the Insight Row and week card; the DS text says rows and cards use 18 to 20.

---

## 4. Icons (`34:681`)

One set, 1.8 stroke, 24 grid, stroke bound to `--ink` (use `currentColor` in code). Render via `<Icon name="..." />`. Pull each tile's node.

| name | node | name | node | name | node |
|---|---|---|---|---|---|
| back | `34:686` | close | `34:689` | chevron | `34:692` |
| week | `34:695` | plans | `34:698` | you | `34:701` |
| heart | `34:704` | box | `34:707` | moon | `34:710` |
| people | `34:713` | chain | `34:716` | clock | `34:719` |
| calendar | `34:722` | file | `34:725` | paste | `34:728` |
| plus | `34:731` | pencil | `34:734` | bell | `34:737` |
| walk | `34:740` | car | `34:743` | hand | `34:746` |
| message | `34:749` | copy | `34:752` | check | `34:755` |
| undo | `34:758` | sun | `34:761` | arrow | `34:764` |
| trash | `34:767` | water | `34:770` | cup | `34:773` |
| fork | `34:776` | book | `34:779` | film | `34:782` |
| home | `34:785` | mountain | `34:788` | leaf | `34:791` |
| music | `34:794` | mic | `34:797` | phone | `34:800` |
| bolt | `34:803` | meeting | `34:806` | train | `34:809` |
| noise | `34:812` | refresh | `34:815` | settings | `185:80` |
| mail | `362:80` | apple | `360:7199` | google | `360:7476` |
| show (eye) | `371:80` | hide (eye-off) | `371:89` | | |

Notes: `apple` and `google` tiles are mislabeled "mail" in layers; `google` is the only multicolor icon, keep its fills. Some Final screens use icons not in this set (scissors, snail, paper-airplane, pencil-in-circle); pull those from the screen node and add them here.

---

## 5. Paper creatures (`34:818`)

Hand-cut paper with googly eyes. A day is a stack of scraps: each scrap is a plan, its **height is the energy it costs**, its colour and top cut are the kind of plan. A lone character is cut to its mood. Past days drain to kraft grey and fall asleep. All creatures carry `--shadow-paper`.

### Character: `<PaperSpirit mood="..." />` (set `34:825`, 96x104)
| Mood | node | Shape | Face |
|---|---|---|---|
| Bright | `34:826` | Sunflower | Wide googly eyes, smile |
| Fine | `34:836` | Rounded arch | Calm eyes |
| Stretched | `34:845` | Pinking-shear top | Side-eye |
| Spent | `34:855` | Peak | Wide eyes, "o" mouth |
| Asleep | `34:864` | Cloud | Closed eyes |
| Work ("Something") | `120:1516` | Snipped-corner square, blue | Side-eye |

Fill binds to `--mood-*`, eyes to `--creature-ink`. Build as one SVG body per mood plus a face layer so moods can swap without new art.

### Scrap: `scrapPath(cat, w, h, seed)` (set `34:878`, 96x80)
| Kind | node |
|---|---|
| Work | `34:879` |
| Social | `34:882` |
| Obligation | `34:885` |
| Enjoy | `34:888` |
| Rest | `34:891` |
| Past | `34:894` |

The code hint is a **function**, not static art: scraps must stretch to any height (energy), so generate the path. Use the downloaded SVGs as the visual reference for each top cut, then write `scrapPath` to produce: flat sides with a slight hand-cut wobble (seeded so it's stable), and the kind's top cut. Rest is a short cushion that sits under the stack, not a block.

### Week shelf (`34:907`, also live in Your week `438:3584`)
Seven stacks on one baseline. Dotted line = a full day (10 energy). Stack scraps bottom-up by plan; the top scrap gets the day's face. Past days use Past scraps with sleepy eyes. Rest sits on a pink cushion. Selected day label is a black pill.

### Header shelf art (`34:347`)
Same shelf, smaller, for marketing or empty states.

---

## 6. Components (`34:957`)

All fills, radii and padding bind to tokens. Selection always goes `--sel-bg` with `--sel-ink`.

| Component | Set node | Code hint | Spec |
|---|---|---|---|
| Button | `34:965` | `.btn.ink` / `.btn.quiet` / `.btn.text` | 54 tall capsule, Body Strong. Variants: Primary, Quiet, Text × Default, Disabled. Props: label, showIcon, icon. One primary per screen. Disabled primary is `--ink-3` fill; disabled quiet/text drop to `--ink-3` text |
| Choice Card | `34:987` (off `34:988`, on `34:992`) | | 114x156, `--fill`, r 18. Character + title (Body Strong) + quiet line (Sub). Selected: `--sel-bg`, white title, `--ink-3` line. Character mood is a prop |
| Chip | `34:1000` (off `34:1001`, on `34:1004`) | `.chip[aria-pressed]` | 36 tall capsule, px 14, Body/Sub Strong. Grey until chosen, then black |
| Icon Button | `34:1010` | `.circ` | 44 circle, `--fill`, 22 icon. Back and close in the nav row |
| Insight Row | `34:1016` | `.ins-row` | `--fill`, r 18, h 60, pl 14 pr 12, gap 12. Icon 22 + title (Body Strong) + detail (Sub, `--ink-2`), trailing Chevron or Action (black chip, e.g. "Rest") |
| Tab Bar | `31:62` (tab states `34:1033`) | | Floating white capsule, `--shadow-soft`, `--rule` border. Week, Plans, People, You. Current tab is a black pill |

---

## 7. Scene illustrations (Final page `1:11`)

One-off compositions built from characters plus accessories. Export each as a single SVG unless noted.

| Scene | node | Screen |
|---|---|---|
| Sunshine logo | `360:7718` | Splash |
| Little guys + hourglass + confetti | `360:7059` | Pre-login |
| Celebrating (party hat) | `360:7731` | Sign up, Login |
| Cozy (mug) | `368:8336` | Forgot password |
| Focused / quiet / painter trio | `378:11007` | Onboarding start |
| Sleepy in bed | `378:11342` | Q1 |
| Mostly alone / It depends / With people | `378:11594`, `378:11604`, `378:11618` | Q1 answer cards |
| Recharging (battery) | `378:11845` | Q2 |
| Bubble bath | `378:12001` | Q3 |
| Reading nook star | `391:12384` | Transition |

Accessories in these scenes are named "editable accessories" so they can later layer onto `PaperSpirit`. For now ship them as flat SVGs.

---

## Checklist for Claude Code

1. `get_variable_defs` on `34:397` and `34:632`; confirm values match `src/styles/tokens.css`.
2. Download all 50 icons into `src/assets/icons/`, normalize stroke to `currentColor`.
3. Download 6 character SVGs and 6 scrap SVGs.
4. Build `<Icon>`, `<PaperSpirit>`, `scrapPath()`, `<Scrap>`, `<WeekShelf>`.
5. Build Button, Chip, IconButton, ChoiceCard, InsightRow, TabBar; screenshot-compare each against its set node.
6. Export scene illustrations as needed per screen.
