# Fobo UX audit and proposed flow

10 October 2026 · Design inspection and targeted source review

## Recommendation

Use **Home · Plans · People · You**. Home is the daily capacity briefing; Plans owns the schedule, with agenda and calendar views. Week is a time range, not another destination. Keep Fobo's paper characters, warm tone, and capacity focus.

The alternate calendar is useful inside Plans. Making it the default Home would improve time visibility, but leave the central question unresolved: what does this schedule mean for me, and what should I do next?

This is a heuristic audit, not a usability study. Findings below distinguish observed design/code behavior from proposed improvements. The screen concepts use illustrative events and scores. No Figma designs or application source were changed.

## Evidence reviewed

- [Main flow, including Week, Plans, event detail, People, and You](https://www.figma.com/design/Ox8dcrF4xN8bbBtGFaZyqB/Fobo?node-id=391-12410).
- [Alternate three-day/week calendar](https://www.figma.com/design/Ox8dcrF4xN8bbBtGFaZyqB/Fobo?node-id=541-2277).
- [Additional Week toggle exploration](https://www.figma.com/design/Ox8dcrF4xN8bbBtGFaZyqB/Fobo?node-id=541-1551).
- Local Home, Plans, WeighPlan, PlanDetail, WeekShelf, data-loading and weekly-summary source. This was static inspection, not an end-to-end runtime test.
- Review lens: clear system status, consistent terminology, visible choices, user control, and focused hierarchy, following [Nielsen Norman Group's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). These principles inform the review; they do not establish that a particular redesign will outperform the current one.

## Priority findings

| Priority | Observed problem | Likely consequence | Proposed change |
|---|---|---|---|
| P1 | Week summarizes the week; Plans repeats the same week's events; a second calendar is being explored under Week. | People must learn where each scheduling task belongs. | Home summarizes capacity. Plans owns all schedule browsing and editing. Preserve the selected date when switching views. |
| P1 | “Weigh a plan” is the main Home action, but there is no completed impact-to-commitment path in the reviewed frontend. | The product's distinctive promise stops before the useful decision. | Connect draft or invite → impact preview → optional adjustment → explicit add → scheduled plan and updated day. |
| P1 | The original Home says Wednesday has “3 plans left,” but “Up next” is “Social · Tomorrow 11:30.” | Users cannot reconcile the next action with the summary. | Use one date scope and one source for counts and next events. Show an actual event title and link directly to it. |
| P1 | “Time for you” sits beside a daily count; the server computes scheduled enjoy/rest hours across the week. | A weekly scheduled total can be mistaken for today's available free time. | Label the existing metric “Personal time scheduled this week,” or calculate and label a daily metric. Separate scheduled rest, unscheduled time, and capacity. |
| P1 | Stack heights, a dotted threshold, drop icons, and bare 7/10 scores are not explained together. | A high score could mean either feeling energetic or being heavily booked. | Use “Estimated day load · 7/10” and “Higher means more demanding.” Label the threshold. Explain individual event cost separately; allow correction. |
| P2 | Plans defaults to Social in the reviewed code. A large category-count card precedes the agenda. | Work and other events can appear missing; users scroll past a count to find a plan. | Default to all scheduled plans, grouped by day. Move categories into a secondary filter and shrink the count to metadata. |
| P2 | The seven-column calendar truncates event titles; the visible grid begins at 4 AM and the floating action covers events. | Timing and names remain difficult to read on a narrow phone. | Use agenda as the first view; offer Day, 3 days, Week in a labeled view selector. Start near the current/first relevant hour; reserve space for persistent controls. |
| P2 | Event detail displays “Leave by 10:30” while also asking users to “Plan my exit.” | The user cannot tell whether an exit is already configured. | Show “Set leave time” before creation and “Edit leave time” afterward; identify whether a reminder is enabled. |
| P2 | “Social” and “Event” appear as primary event names; the 3-day exploration's date range does not match its displayed day columns. | Generic labels and conflicting dates reduce trust. | Use real titles and derive range headers from the visible dates. |

P1 = resolve before evaluating the end-to-end concept. P2 = resolve in the next design pass. These priorities are judgments, not measured severity scores.

## Responsibilities of each destination

| Destination | User question | Contents and behavior |
|---|---|---|
| Home | How does today look, and what needs my attention? | Plain-language capacity summary, compact weekly strip, next one or two events, considering-plan shortcut, one relevant action. |
| Plans | What is scheduled, and what am I considering? | Scheduled / Considering states. Scheduled supports agenda and calendar representations of the same events; date navigation and categories are secondary controls. |
| People | Who am I planning with? | People and shared plans; links into the same plan details and planning flow. |
| You | What should Fobo know about me? | Capacity preferences, character, integrations, and settings. |

Keep People for this iteration to limit scope. If testing shows it is rarely a destination, a later simplification could move it into plan creation and profile. There is no usage evidence yet to justify removing it.

Home and Plans can display the same event without duplicating responsibility: Home gives a timely shortcut, Plans provides the complete workspace. Selecting a day on Home's weekly strip should open that date in Plans. Opening an event should always open that event, not an unfiltered list.

## Home hierarchy

1. **Today, with an explicit date.** A short forecast such as “Room for a steady day,” with the estimated day load and a way to understand it.
2. **Compact week outlook.** Keep the expressive paper stacks; make dates tappable, label the scale, and distinguish selected day from today. Do not require interpreting faces to understand load.
3. **Up next.** Show actual event name, time, and any relevant leave-time reminder. If an event is underway, show “Now”; if none remain, say so.
4. **Considering.** A small count/link only when there are saved possibilities or unanswered invites. It opens Plans → Considering.
5. **One contextual action.** “Check a new plan” in a normal state; “Review Saturday” when Saturday needs attention; “Add your first plan” for a new account. Show a concrete reason for a suggested adjustment.

“Weigh a plan” can remain a brand phrase, but test it against “Check a plan.” The latter describes the immediate action more plainly. The existing “Weight a plan” typo should disappear everywhere.

## Complete the decision flow

**Home: Check a new plan → describe or select a considering plan → preview impact → adjust if wanted → Add to my plans → View the affected day.**

- A new plan asks for title, date/time, and only the context necessary to estimate its cost. Offer “Save for later”; save under Considering.
- An existing Considering item enters the impact preview directly, preserving its details.
- The preview compares the affected day's current planned load with the proposed load, names the assumptions, shows adjacent commitments, and distinguishes a time collision from high energy demand.
- Offer small changes such as another time/day or a shorter stay. Recalculate the preview before saving. A suggestion should never silently move an event, add recovery time, or send an invitation.
- “Add to my plans” is the explicit commitment. The concept saves locally to Fobo and states that no invite is sent. If calendar writing or RSVP is supported, name the actual destination and consequence instead; do not bundle those silently.
- Confirmation says what was saved, offers Undo, and opens the affected date. Home, list, calendar, and detail all update from the same plan.
- “Keep considering” leaves the schedule and its load unchanged. A preview must not permanently count toward scheduled totals.
- Declining an external invitation is distinct from archiving a private idea. Use different labels and show whether anyone will be notified.

For an existing scheduled event, detail should offer Edit, Move, and the appropriate leave-time action. “Move” opens a prefilled comparison, not a fresh create flow. Imported confirmed events should not require being weighed again just to appear in the schedule.

## Score and state rules

- Treat the score as an estimate of planned demand, not a measurement of how someone actually feels. A personal check-in, if added, must be labeled separately.
- Keep daily load and event cost consistent with the shared model. The current code uses 10 units per day and defines 8+ as full. The proposed 4 → 7 example illustrates that model; it is not a validated prediction.
- Show text labels as well as color and facial expressions. Give charts an accessible explanation, use generous touch targets, and verify contrast and larger text layouts during implementation.
- Display “Not estimated yet” for missing estimates; zero should not stand for missing data. Show overload above the threshold instead of silently capping it at 10.
- An unscheduled hour is not automatically rest. Scheduled rest is not proof of recovery.
- Preserve selected date and view mode within Plans, and provide an obvious Today action. Full Week remains an optional overview; Month can wait until a real task requires it.

## Implementation gaps that compound the flow problem

These are confirmed in the reviewed frontend source, not inferred from how a static Figma button looks:

- [Home calendar button](/Users/thashinbhuiyan/fobo/src/screens/main/YourWeek.tsx:36) has no action; [Up next](/Users/thashinbhuiyan/fobo/src/screens/main/YourWeek.tsx:63) navigates to Plans rather than a specific event.
- [Plans](/Users/thashinbhuiyan/fobo/src/screens/main/Plans.tsx:67) starts with the Social filter; its Add control has no action.
- [Weigh this plan](/Users/thashinbhuiyan/fobo/src/screens/main/WeighPlan.tsx:78) has no handler, and a source comment says the weighing step is not designed yet.
- [Plan detail](/Users/thashinbhuiyan/fobo/src/screens/main/PlanDetail.tsx:42) renders edit and footer actions without handlers; Invite via link uses an empty handler.
- [Weekly personal time](/Users/thashinbhuiyan/fobo/server/src/routes/week.ts:24) sums scheduled enjoy/rest events across the week, which is materially different from available time today.

Wire one complete vertical flow before adding more calendar modes. A useful first slice is: create a draft → preview impact → commit → see it on Home and Plans → reopen it → undo or edit it.

## States to design before implementation

| State | Required response |
|---|---|
| No calendar connected | Explain the benefit; offer connection and manual entry. |
| No plans today | Say “Nothing scheduled today”; do not equate missing data with unlimited capacity. |
| No considering plans | Explain what can be saved here and offer “Check a new plan.” |
| Full or overloaded day | Name the affected date and contributing events; allow inspection and optional changes. |
| Estimate unavailable | Keep entered details; show retry or manual estimate instead of inventing a score. |
| Save/sync failure | Preserve the draft; clearly show what has and has not been saved. Never show success before persistence. |
| Missing/deleted event | Show a useful explanation and return path, rather than a blank detail screen. |
| Calendar data unavailable | Show connection or freshness status. Sample data, if shown for onboarding, must be explicitly labeled as a demo. |

## Order of work and validation

1. Agree on the destination and plan-state model; make a clickable prototype of the two boards.
2. Finish the complete considering-to-scheduled path and direct event navigation.
3. Reconcile daily/weekly metrics, consistent estimates, default filters, and truthful empty/error states.
4. Add the three-day calendar inside Plans and test whether a full-week view is needed.

Run a small formative test with representative users, using neutral tasks: find the next event, explain Friday's score, check whether dinner fits, save it without committing, then schedule it and change its time. Ask where they would go before they tap. Record first destination, backtracking, completion, score interpretation, and whether they believe checking a plan books or messages anyone. Compare agenda-first and calendar-first entry with the same tasks. This would test the proposed information architecture before further visual polish.

## Concept deliverables

- [Board 1: Home, Plans agenda, Plans three-day calendar](/Users/thashinbhuiyan/fobo/output/ux-audit-2026-10-10/01-home-and-plans.png).
- [Board 2: describe a possibility, preview its impact, confirm the saved plan](/Users/thashinbhuiyan/fobo/output/ux-audit-2026-10-10/02-check-plan-flow.png).
- [Exact image-generation prompts](/Users/thashinbhuiyan/fobo/output/ux-audit-2026-10-10/concept-prompts.md) and [final correction prompts](/Users/thashinbhuiyan/fobo/output/ux-audit-2026-10-10/final-edit-prompts.md).

The boards are directional raster mockups, not editable Figma screens or production specifications. Some larger-text, error, and considering-list states are defined above rather than shown in the images.
