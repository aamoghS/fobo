# CLAUDE.md

Context for Claude Code working on **Fobo**.

## What Fobo is

Fobo (Fear of Burning Out) is a mobile-first capacity planner built for a hackathon. Free time is not the same as having energy: Fobo learns how much each plan costs you and helps you protect your recharge time.

Team: Thashin (UI design), Tory Deutsch (UX design), Mariem Touati (UX writing + UX design).

## Source of truth

- **Design:** `DESIGN.md` (principles, screens, voice) and `DESIGN_SYSTEM.md` (Figma pull map: tokens, icons, characters, scraps, components with node IDs). Read both before any UI work. `DESIGN_SYSTEM.md` wins on token conflicts.
- **Tokens:** `src/styles/tokens.css`, generated from the Design System page.
- **Figma:** file key `Ox8dcrF4xN8bbBtGFaZyqB`. Design System page `1:6` for building blocks, page **✅ Final** (`1:11`) for screens. Only frames inside sections marked ✅ are final. Node IDs for every screen are listed in `DESIGN.md` §4.
- Use the Figma MCP (`get_design_context`, `get_screenshot`) on a screen's node ID before building it. Follow the figma-design-to-code skill. Treat Figma's React+Tailwind output as a reference, then convert to this repo's conventions.

## Hard rules

1. **Light mode only.** No dark theme, no `prefers-color-scheme` branches.
2. **Tokens, not hex.** All colors, radii, shadows, and type come from the tokens in `DESIGN.md` §2 (via `tokens.ts` in code). Never hardcode a value that has a token.
3. **DM Sans everywhere,** including chips (Figma uses Inter there by mistake).
4. **Mobile frame first.** Design width is 393px. Center a max-width 430px column on larger screens.
5. **Reuse the Figma code hints:** `.btn.ink|.quiet|.text`, `.circ`, `.chip[aria-pressed]`, `.ins-row`, `<Icon name="..." />`, `<PaperSpirit mood="..." />`, `scrapPath(cat, w, h, seed)`.
6. **Never redraw characters or icons.** Export them from Figma as SVG and keep them as assets. The one exception is scraps: generate them with `scrapPath` so height can show energy, matching each kind's top cut from the Figma SVGs.
7. **Colour means something.** Scrap colour = plan kind, character colour = mood. Never use the cut-paper palette for UI chrome or errors.
8. **Copy is designed.** Use the exact strings from Figma, except the known typos listed in `DESIGN.md` §5.
9. **No em dashes in UI copy** unless they exist in Figma.

## Conventions

- **Expo (React Native) + TypeScript + expo-router**, targeting iOS, Android and web. Run `npm run dev` for web, `npm start` for devices.
- Styling: `src/styles/tokens.css` is the source. `npm run tokens` regenerates `src/styles/tokens.ts`, which components import (`color`, `radius`, `shadow`, `type`). Never edit `tokens.ts` by hand. Styles are colocated `StyleSheet`s. Don't add Tailwind.
- The Figma class hints map to components: `.btn.ink|quiet|text` → `<Button variant>`, `.circ` → `<IconButton>`, `.chip[aria-pressed]` → `<Chip pressed>`, `.ins-row` → `<InsightRow>`, plus `<Icon>`, `<PaperSpirit>`, `scrapPath()`.
- SVGs import as components (`react-native-svg-transformer`). Ink strokes use `currentColor`; pass `color`.
- Folder shape:
  ```
  src/
    app/                 expo-router routes (thin; they render screens/)
    assets/characters/   PaperSpirit moods (34:825)
    assets/scraps/       scrap reference SVGs (34:878)
    assets/faces/        week shelf face layers
    assets/icons/        24px line icons (34:681)
    components/          Button, IconButton, Chip, PlanRow, TabBar, TextField, RadioRow, ChoiceCard, Progress, EnergyDrops, PaperSpirit, Scrap, WeekShelf
    screens/             one folder per section: auth/, onboarding/, main/
    styles/              tokens.css, tokens.ts, type.ts, global.css (web)
    data/                mock week, plans, people
  ```
- Mock data lives in `src/data/` and matches Figma content (Dinner at Comal, Dani, Jun, Hana, Ava, Lea, 5–11 October).
- Every interactive element: `components/Pressable` with an `accessibilityRole` (it adds the keyboard focus ring), and a 44px minimum hit area (use `hitSlop` when the visual is smaller).

## Workflow

1. Read `DESIGN.md`.
2. For the screen you're building, call `get_screenshot` + `get_design_context` on its node ID.
3. Build shared components first, then screens.
4. Run the app and compare against the Figma screenshot at 393px wide. Fix spacing and type before moving on.
5. Keep commits small and scoped to one screen or component.

## Ask before

- Building anything from the loose frames (Profile, Capacity Profile, Edit Character, Settings). They are not marked final.
- Adding a dependency beyond routing, an icon/SVG loader, or a date library.
- Changing any token value.
