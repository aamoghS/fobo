# Fobo server

The API for the Fobo app: profiles, plans, friends and capacity sharing, Google Calendar sync, and
the "Fix my week" planner. Everything runs on Neon: Postgres and the API itself as a Neon Function, which also
runs sign-in (Google and email). The frontend (`../src`) is the source of truth for shapes.

- `functions/api.ts` the Neon Function (declared as `api` in `../neon.ts`)
- `src/app.ts` the API as a fetch handler; `src/server.ts` serves it with Node for local runs
- `src/auth.ts` issues and checks the API's session tokens (HS256), and accepts Neon Auth JWTs (EdDSA)
- `src/db.ts` one transaction per request, `SET LOCAL ROLE app_user | app_service`, Drizzle on top
- `src/schema.ts` Drizzle schema; `../db/migrations` (SQL) stays the source of truth, since it also
  holds roles, row-level security and the friend functions
- `src/routes/` endpoints; `src/google.ts`, `src/sync.ts` Google Calendar; `src/planner.ts` the planner
- `scripts/migrate.ts` applies `../db/migrations` in order, once each
- `../packages/core` (`@fobo/core`) what the app and the API share: day room and other constants, the app's
  options (character, tints, plan kinds, onboarding answers), the achievement catalog, and the wording the API
  writes (Capacity Profile values, titles, widget, streak). The API accepts only the shared options.

## Environment

Read from `../.env.local` (never committed). `neon.ts` deploys the ones that are set to the function.

| Variable | Used for | Status |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection, as the owner role | set |
| `NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL` | checking sign-in tokens | set |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET` | refreshing Google Calendar access; must be the client set as Neon Auth's Google provider | set |
| `GEMINI_API_KEY` | the planner; without it `/fix-calendar` answers 503 | set, working (about 2 s per fix) |
| `GEMINI_MODEL` | planner model; without it `/fix-calendar` answers 503 | set (`gemini-3.8-flash`) |
| `AUTH_SECRET` | signs app sessions and encrypts Google refresh tokens | set |
| `PUBLIC_API_URL` | the API's public address, for Google's callback | set |
| `CONTACT_EMAIL` | contact on the home, privacy and terms pages | set |
| `EXPO_GO_USERS` | No longer read: Expo Go returns come from `dev_returns` (see below) | set (`aamoghs`) |
| `WEB_APP_ORIGINS` | hosted web app origins sign-in may return to, comma separated | empty (no hosted web app) |
| `PORT` | local server port, default 8787 | optional |

## Google sign-in and Calendar

Web, Expo Go and app builds all sign in the same way: the app opens `/auth/google/start` in a browser,
the API runs Google's sign-in (with Calendar access), creates or finds the profile, keeps the Calendar
refresh token encrypted in `google_accounts` (migration 014), links and syncs the calendar, and sends
the browser back to the app with a session token (HS256, `AUTH_SECRET`, 60 days). The API also accepts
Neon Auth tokens. Neon Auth cannot sign in from an ID token, so it cannot serve the phone apps.

The session goes back only to the app build (`fobo://`), a hosted web origin in `WEB_APP_ORIGINS`, web pages on
`localhost`, or an Expo Go dev server registered by exact host in `dev_returns` within the last 7 days.
`npm run dev:all` registers the one it starts (it needs `DATABASE_URL`). Matching tunnels by Expo username let
anyone name a tunnel after a teammate and receive sessions, so it was dropped. The app adds a
one-time nonce to its return address and keeps the session only when it comes back with that nonce. Only an
email Google verified is stored.

Google Cloud (project `fobo-511204`): the web client lists the API's callback
(`<PUBLIC_API_URL>/auth/google/callback`). The app is published but unverified: anyone can sign in after
Google's unverified-app warning, up to 100 users.

## Email sign-in

`POST /auth/email/signup` `{ name, email, password }` creates the profile and an `email_accounts` row
(migration 018: the email lowercased, the password as a bcrypt hash made by pgcrypto's `crypt`, readable only
by `app_service`) and answers `{ session }`. `POST /auth/email/login` `{ email, password }` answers `{ session }`,
or 401. Passwords need at least 8 characters; a taken email is a 409. There is no password reset yet. Adding a
friend by email prefers a Google account over an email sign-up with the same address (nobody verifies those).

## Timezones

Each profile has a timezone; the app's local times are read and written in it. The app sends the phone's
timezone at sign-up and whenever it differs from the profile's (`PATCH /me`, checked against the runtime's
timezone list). A change makes the next Google sync read every calendar in full, since all-day events are
placed in the timezone.

## Weigh a plan

`POST /weigh` takes a tentative plan from the calendar (`planId`) or a plan or invite as written (`text`).
Gemini (`src/weigh.ts`) reads the profile, check-in memories and the next two weeks, and answers the plan's
title, kind, times and people (read out of the text), its cost to this person, why, and a leave-by time when the
profile says they'd fade or the day would go over. The server checks the answer, works out the day's load before
and after itself, and saves the cost and why (with that day line, wording in `@fobo/core`) on the plan, so Event
detail shows it. About 4 s per weigh; no transaction stays open during the call.

## Performance

- GET answers carry a weak ETag (`Cache-Control: private, no-cache`). The app sends `If-None-Match` and
  reuses its copy on `304`, so the 30 s polling costs little when nothing changed; any write clears it.
- Google access tokens are reused for their lifetime (about an hour) per function instance.
- `/google-sync` skips accounts synced in the last 30 s, so several devices polling share one sync;
  calendars are fetched from Google in parallel.
- `/friends/:id/days` is one query (scores joined with each day's blocks); People and `/friends` get every
  friend's next plan and past count in one query.
- One pooled Neon connection per function instance, over WebSockets (port 443); each request is one
  transaction with `SET LOCAL ROLE`.

## Routes

Times are the user's local wall-clock, `'2026-10-05T09:00'`, as the app writes them. Times sent without an
offset are read in the profile's timezone; times with `Z` or an offset are taken as given.

| Method | Path | Does |
|---|---|---|
| GET | `/me` | creates the profile on first call, returns it with the sign-in `email` |
| PATCH | `/me` | handle, name, bio, tint, character, timezone, rechargeStyle, busyStreak, protectedHours, onboarding, writeBack, shareBlocks, shareScores; character, tint and onboarding must be the shared options, timezone a known one |
| GET | `/week?start` | `src/data/week.ts`: `start`, `end`, `personalHours`, `upNext { id, title, kind, when, start }`, plus `days` with `load`, `room` and `over` |
| GET | `/profile` | `src/data/profile.ts`: `{ profile { name, title, email, streak }, achievements, widget, capacity }` |
| GET | `/people` | `src/data/people.ts`: `Person[]` (`id`, `name`, `tint`, `character`, `nextLabel`, `bio`, `pastTogether`) |
| GET | `/plans?from&to` | plans overlapping the window, as `Plan` (+ `visibility`, `protected`, `source`) |
| GET, PATCH | `/plans/:id` | one plan with `detail` (PlanDetail: costNote, exit, reminder); a Google plan's new title or time is written to Google Calendar first (when its account allows write-back) |
| POST | `/plans/:id/invite` | `{ url }`: a signed link to a public page with the plan's name, time and who's inviting (`GET /invite/<id>.<signature>`, no token needed) |
| DELETE | `/plans/:id` | removes a Fobo plan; a Google plan is declined instead, so sync does not bring it back |
| POST | `/plans` | adds a plan: `title`, `start`, `end`, `kind` (a shared plan kind), `energyCost`, `shared` or `visibility`, `leaveBy`, `with`, `costNote`, `exitNote`, `reminder` |
| GET | `/friends` | `{ friends, incoming, outgoing }`; friends carry `bio`, `tint`, `nextPlan`, `pastTogether` |
| POST | `/friends` | `{ handle }` or `{ email }` (the email they signed in with): sends a request |
| POST | `/friends/:id/accept` | accepts their request |
| DELETE | `/friends/:id` | unfriend, cancel or decline |
| GET | `/friends/:id/days?from&to` | `FriendDay[]`, at most 14 days |
| GET | `/friends/:id/blocks?date` | a friend's blocks for one day |
| GET | `/scores/:id?from&to` | daily `load`, `room` and `over` (past the room), for yourself or a friend who shares them |
| GET | `/people/:id` | public profile (handle, name, character, bio, tint) with `nextPlan` and `pastTogether` |
| GET | `/auth/google/start?return`, `/auth/google/callback` | Google sign-in for the apps (no token needed) |
| POST | `/auth/email/signup`, `/auth/email/login` | email sign-in; answers `{ session }` (no token needed) |
| POST | `/google-sync` | pulls Google changes for every connected account |
| GET, PATCH, DELETE | `/connections[/:id]` | Connected Apps & Devices; per-account `writeBack`; disconnecting removes that account's synced plans |
| POST | `/fix-calendar` | `{ days }` (1 to 14): asks the planner, saves a proposed fix |
| POST | `/apply-fix` | `{ fixId, only? }`: applies the picked changes once |
| POST | `/weigh` | `{ planId, exit? }` or `{ text }` (`exit`: Plan my exit, always a leave-by time): Gemini weighs one plan; answers the plan (a written one is saved as tentative) with `detail` and `day { date, before, after, room, over }` |

Friends never read `events`: blocks and scores come from `friend_blocks` and `day_scores`, which hide
titles by visibility (`private` grey block, `busy` block and colour, `open` with title).

## The app and the API

On start, `src/data/live.ts` asks the API for the signed-in user's week, plans, people and You tab, and
fills the modules in `src/data/` with them, so screens read real data through the same imports.
Signed out, the modules are empty; the app opens on Your week when signed in, else on Pre-login. Declined
plans are left out, and tentative ones fill `invites` (Weigh a plan). In the foreground the app refreshes every
30 s, when a screen opens, and when it comes back from the background (Google Calendar sync at most once
a minute); screens redraw after each load. Choices save as they are made: each onboarding or Capacity
Profile answer, and each character change (0.4 s after the last one), write to `/me` and reload, so the
You tab updates at once. Log out empties the modules. Email sign-up and log-in call `/auth/email/*`. The onboarding
energy comparison pairs plans from the user's own last week (up to four pairs); picking one raises its cost
past the other's. Friends' avatars and banners draw the character they made.

Google sync reads every calendar shown in the person's Google Calendar (fetched in parallel), including
all-day events, which cover their days and cost nothing. Timed events start at half a point an hour
(0.5 to 5). Sign-in asks for the calendar list (`calendar.calendarlist.readonly`) and event access. Events are
keyed by account, calendar and Google id. An invite the user hasn't answered (or said maybe to) is a tentative
plan (`proposed`): it waits on Weigh a plan and doesn't fill a day until accepted. Sync keeps Fobo's own status
(deleted, moved) unless Google says the user declined.

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
npm run allow-expo-go -- <host>  # let Google sign-in return to a teammate's dev server (needs .env.local)
```

Without `.env.local` the app still uses the deployed API and email sign-in works. `npm start` (same as
`dev:all`) registers its dev server for Google sign-in when `.env.local` has `DATABASE_URL`; otherwise it prints
the host for a teammate to allow with `allow-expo-go`.

In Expo Go, sign in with the same Expo account (project `aamoghss-team/fobo`). `npm start` also uses the
tunnel; `npm run start:lan` does not.

The API is deployed as the `api` Neon Function. After API changes, from the repo root, with
`../.env.local` loaded into the environment: `npx neonctl deploy --no-env-pull`. Migrations:
`npm run migrate`. The API reaches Neon with its serverless driver over port 443.


## Setup still needed

1. Google verification (needs a domain we own) to drop the unverified-app warning and the 100-user cap.
2. Store builds: `npx eas-cli build` needs an Apple Developer account for iPhone.

## Known gaps

- Nothing writes `memories` yet, so the planner has no check-in history.
- A fix applies once; unpicked changes need a new fix.
- The server does not check that a moved plan overlaps another plan.
- No scheduled sync: Google syncs only when the app calls `/google-sync`.
- The `uploads` bucket in `neon.ts` is unused: the app has no uploads.
- Wording the API writes that no Figma frame has, in `packages/core/src/copy.ts` for design to replace: profile
  title `Homebody`; widget headlines `A full day.` and `Over the line today.`; widget next `Nothing else today`;
  Capacity Profile values other than the drawn ones (`Recharges alone`, `Fades after ~1 hr`, recovery wording).
  The streak counts days in a row within the day's room, from the day the user joined.
- Achievements, checked on each `/profile`: The Irish Goodbye (a plan with a leave-by time has ended), Slow and
  Steady (a 7-day streak), More the Merrier (a plan with 3 or more people), The First Week (a week after joining).
- Forgot password has no API call: there is no email service to send a code.
- Add plan, Add person (`/people/add`) and the plan form are built from design system parts, not Figma frames.
- A Google invite declined and later accepted stays declined in Fobo.
- Email log-in has no rate limit, and there is no password reset.
- `/google-sync` and `/fix-calendar` hold a database transaction open while they call Google and Gemini.