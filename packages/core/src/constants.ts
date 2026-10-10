// Shared by the app and the API server (server/src/time.ts). DAY_ROOM must also match day_scores
// in db/migrations/009_frontend_shapes.sql.

/** Every day has 10 units of room. */
export const DAY_ROOM = 10;

/** A day at 8 or more is full. */
export const FULL_DAY = 8;
