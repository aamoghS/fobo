# Fobo server

API server: Google Calendar sync, friend capacity sharing, Neon Functions.

- `src/` server code (`db.ts` request transactions, `time.ts` DAY_ROOM)
- `functions/` Neon Functions (see `../neon.ts`)
- `scripts/migrate.ts` applies `../db/migrations`
- `test/` API-level privacy tests (need `TEST_DATABASE_URL` on a throwaway branch)

```
npm run migrate
npm run typecheck
TEST_DATABASE_URL=... npm test
```
