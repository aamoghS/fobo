# Fobo server

API server: profiles, plans, friend capacity sharing, Google Calendar sync, the planner.

- `src/server.ts` HTTP server; every route needs a Neon Auth token (`Authorization: Bearer ...`)
- `src/auth.ts` verifies tokens against `NEON_AUTH_JWKS_URL`
- `src/db.ts` request transactions (`SET LOCAL ROLE app_user | app_service`)
- `src/routes/` endpoints
- `functions/` Neon Functions (see `../neon.ts`)
- `scripts/migrate.ts` applies `../db/migrations`
- `test/` API-level privacy tests (need `TEST_DATABASE_URL` on a throwaway branch)

Environment (`../.env.local`): `DATABASE_URL`, `NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`, optional `PORT` (default 8787).

| Method | Path | Does |
|---|---|---|
| GET | `/me` | creates the profile on first call, returns it |
| PATCH | `/me` | updates profile fields |
| GET | `/events?from&to` | plans overlapping the window |
| GET | `/events/:id` | one plan |
| POST | `/events` | adds a plan (`title`, `starts_at`, `ends_at`, ...) |
| PATCH | `/events/:id` | edits a plan; title and time of Google plans are read-only |

```
npm run dev
npm run migrate
npm run typecheck
TEST_DATABASE_URL=... npm test
```
