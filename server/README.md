# Fobo server

The API for the Fobo app: profiles, plans, friends and capacity sharing, Google Calendar sync, and
the "Fix my week" planner. Everything runs on Neon: Postgres, Neon Auth (email and Google sign-in),
and the API itself as a Neon Function. The frontend (`../src`) is the source of truth for shapes.

- `functions/api.ts` the Neon Function (declared as `api` in `../neon.ts`)
- `src/app.ts` the API as a fetch handler; `src/server.ts` serves it with Node for local runs
- `src/auth.ts` verifies Neon Auth JWTs (EdDSA) against `NEON_AUTH_JWKS_URL`
- `src/db.ts` one transaction per request, `SET LOCAL ROLE app_user | app_service`, Drizzle on top
- `src/schema.ts` Drizzle schema; `../db/migrations` (SQL) stays the source of truth, since it also
  holds roles, row-level security and the friend functions
- `src/routes/` endpoints; `src/google.ts`, `src/sync.ts` Google Calendar; `src/planner.ts` the planner
- `scripts/migrate.ts` applies `../db/migrations` in order, once each

## Environment

Read from `../.env.local` (never committed). `neon.ts` deploys the ones that are set to the function.

| Variable | Used for | Status |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection, as the owner role | set |
| `NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL` | checking sign-in tokens | set |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET` | refreshing Google Calendar access; must be the client set as Neon Auth's Google provider | set |
| `GEMINI_API_KEY` | the planner; without it `/fix-calendar` answers 503 | set, working (about 2 s per fix) |
| `GEMINI_MODEL` | planner model, default `gemini-3.8-flash` | optional |
| `AUTH_SECRET` | signs app sessions and encrypts Google refresh tokens | set |
| `PUBLIC_API_URL` | the API's public address, for Google's callback | set in `neon.ts` |
| `PORT` | local server port, default 8787 | optional |

## Google sign-in and Calendar

Web, Expo Go and app builds all sign in the same way: the app opens `/auth/google/start` in a browser,
the API runs Google's sign-in (with Calendar access), creates or finds the profile, keeps the Calendar
refresh token encrypted in `google_accounts` (migration 014), links and syncs the calendar, and sends
the browser back to the app with a session token (HS256, `AUTH_SECRET`, 60 days). The API also accepts
Neon Auth tokens. Neon Auth cannot sign in from an ID token, so it cannot serve the phone apps.

Google Cloud (project `fobo-511204`): the web client lists the API's callback
(`<PUBLIC_API_URL>/auth/google/callback`); the app is in Testing, so only listed test users can sign in.

## Routes

Times are the user's local wall-clock, `'2026-10-05T09:00'`, as the app writes them. Times sent without an
offset are read in the profile's timezone; times with `Z` or an offset are taken as given.

| Method | Path | Does |
|---|---|---|
| GET | `/me` | creates the profile on first call, returns it with the sign-in `email` |
| PATCH | `/me` | handle, name, bio, tint, character, timezone, rechargeStyle, busyStreak, protectedHours, onboarding, writeBack, shareBlocks, shareScores; character and onboarding must be the app's options |
| GET | `/week?start` | `src/data/week.ts`: `start`, `end`, `personalHours`, `upNext { title, when, start }`, plus `days` with `load`, `room` and `over` |
| GET | `/profile` | `src/data/profile.ts`: `{ profile { name, title, email, streak }, achievements, widget, capacity }` |
| GET | `/people` | `src/data/people.ts`: `Person[]` (`id`, `name`, `tint`, `nextLabel`, `bio`, `pastTogether`) |
| GET | `/plans?from&to` | plans overlapping the window, as `Plan` (+ `visibility`, `protected`, `source`) |
| GET, PATCH | `/plans/:id` | one plan with `detail` (PlanDetail: costNote, exit, reminder); title and time of Google plans are read-only |
| POST | `/plans` | adds a plan: `title`, `start`, `end`, `kind`, `energyCost`, `shared` or `visibility`, `leaveBy`, `with`, `costNote`, `exitNote`, `reminder` |
| GET | `/friends` | `{ friends, incoming, outgoing }`; friends carry `bio`, `tint`, `nextPlan`, `pastTogether` |
| POST | `/friends` | `{ handle }`: sends a request |
| POST | `/friends/:id/accept` | accepts their request |
| DELETE | `/friends/:id` | unfriend, cancel or decline |
| GET | `/friends/:id/days?from&to` | `FriendDay[]`, at most 14 days |
| GET | `/friends/:id/blocks?date` | a friend's blocks for one day |
| GET | `/scores/:id?from&to` | daily `load`, `room` and `over` (past the room), for yourself or a friend who shares them |
| GET | `/people/:id` | public profile (handle, name, character, bio, tint) with `nextPlan` and `pastTogether` |
| GET | `/auth/google/start?return`, `/auth/google/callback` | Google sign-in for the apps (no token needed) |
| POST | `/google-sync` | pulls Google changes for every connected account |
| GET, PATCH, DELETE | `/connections[/:id]` | Connected Apps & Devices; per-account `writeBack` |
| POST | `/fix-calendar` | `{ days }` (1 to 14): asks the planner, saves a proposed fix |
| POST | `/apply-fix` | `{ fixId, only? }`: applies the picked changes once |

Friends never read `events`: blocks and scores come from `friend_blocks` and `day_scores`, which hide
titles by visibility (`private` grey block, `busy` block and colour, `open` with title).

## The app and the API

On start, `src/data/live.ts` asks the API for the signed-in user's week, plans, people and You tab, and
fills the modules in `src/data/` with them, so screens read real data through the same imports.
Signed out, or with the API unreachable, the mock data stays. In the foreground the app refreshes every
30 s, when a screen opens, and when it comes back from the background (Google Calendar sync at most once
a minute); screens redraw after each load. Choices save as they are made: each onboarding or Capacity
Profile answer, and each character change (0.4 s after the last one), write to `/me` and reload, so the
You tab updates at once. Log out restores the sample data.

Google sync reads every calendar shown in the person's Google Calendar (fetched in parallel), including
all-day events, which cover their days and cost nothing. Timed events start at half a point an hour
(0.5 to 5). Sign-in asks for the calendar list (`calendar.calendarlist.readonly`) and event access.

- Sign-in (web, Expo Go, builds): Continue with Google opens `/auth/google/start`; the session comes back
  to `/auth` on the web (`src/app/auth.tsx`, kept in localStorage) or into the app through an in-app
  browser (`src/lib/google-auth.ts`, kept in the phone's secure storage).
- App setting in `../.env.local`, and in `eas.json` for builds: `EXPO_PUBLIC_API_URL` (the deployed API).

## Running

The repo is one npm workspace: the app at the root, the API in `server/`, shared logic in
`packages/core` (`@fobo/core`). From the repo root:

```
npm install                 # everything: app, server, core
npx expo login              # once per computer; the tunnel needs an Expo account
npm run dev:all             # Expo over a tunnel: scan the QR code in Expo Go from any network
npm run dev:all -- --web    # also the browser build
npm run dev:all -- --lan    # same Wi-Fi only, no tunnel
npm run dev:all -- --local  # also runs the API here on :8787 (Google sign-in needs the deployed one)
```

In Expo Go, sign in with the same Expo account (project `aamoghss-team/fobo`). `npm start` also uses the
tunnel; `npm run start:lan` does not.

The API is deployed as the `api` Neon Function. After API changes, from the repo root, with
`../.env.local` loaded into the environment: `npx neonctl deploy --no-env-pull`. Migrations:
`npm run migrate`. The API reaches Neon with its serverless driver over port 443.


## Setup still needed

1. Add each tester in Google Cloud (Audience, Test users) while the app is in Testing.
2. Store builds: `npx eas-cli build` needs an Apple Developer account for iPhone.

## Known gaps

- Nothing writes `memories` yet, so the planner has no check-in history.
- A fix applies once; unpicked changes need a new fix.
- The server does not check that a moved plan overlaps another plan.
- No scheduled sync: Google syncs only when the app calls `/google-sync`.
- The `uploads` bucket in `neon.ts` is unused: the app has no uploads.
- Copy written in the API because the mock has no version of it (`src/routes/you.ts`), for design to replace:
  profile title `Homebody`; widget headlines `A full day.` and `Over the line today.`; widget next
  `Nothing else today`; Capacity Profile values other than the mock's own (`Recharges alone`,
  `Fades after ~1 hr`, recovery wording). The streak counts days in a row within the day's room.
- Achievements: only The First Week is awarded (a week after joining); the other three have no rule yet.
- Email sign-up and log-in screens are not wired yet; only Google is.