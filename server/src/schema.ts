// Drizzle schema for the tables in db/migrations (the SQL there is the source of truth: it also
// holds roles, row-level security and the friend functions, which Drizzle does not model).
import { sql } from 'drizzle-orm';
import {
  boolean, customType, integer, jsonb, numeric, pgTable, pgView, primaryKey, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';

// A Postgres tstzrange, read and written as its text form: ["2030-01-15 09:00:00+00","...").
const tstzrange = customType<{ data: string }>({ dataType: () => 'tstzrange' });

// Plan costs are numeric(3,1); hand them over as numbers.
const tenths = customType<{ data: number; driverData: string }>({
  dataType: () => 'numeric(3, 1)',
  fromDriver: (v) => Number(v),
});

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  // Not null in the database; a trigger fills it on insert when it is left out.
  handle: text('handle'),
  name: text('name'),
  character: jsonb('character'),
  timezone: text('timezone').notNull().default('UTC'),
  rechargeStyle: text('recharge_style'),
  busyStreak: integer('busy_streak').notNull().default(0),
  protectedHours: jsonb('protected_hours'),
  onboarding: jsonb('onboarding').notNull().default({}),
  writeBack: boolean('write_back').notNull().default(false),
  shareBlocks: boolean('share_blocks').notNull().default(false),
  shareScores: boolean('share_scores').notNull().default(false),
});

export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull().default('google'),
  accountEmail: text('account_email').notNull(),
  writeBack: boolean('write_back').notNull().default(true),
  syncToken: text('sync_token'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  time: tstzrange('time').notNull(),
  category: text('category'),
  cost: tenths('cost').notNull().default(0),
  visibility: text('visibility').notNull().default('busy'),
  protected: boolean('protected').notNull().default(false),
  status: text('status').notNull().default('accepted'),
  declined: boolean('declined').generatedAlwaysAs(sql`status = 'declined'`),
  leaveBy: text('leave_by'),
  withPeople: text('with_people').array().notNull().default(sql`'{}'`),
  source: text('source').notNull().default('capacity'),
  connectionId: uuid('connection_id'),
  externalId: text('external_id'),
  etag: text('etag'),
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  kind: text('kind').notNull(),
  person: text('person'),
  felt: text('felt'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const friendships = pgTable('friendships', {
  requesterId: text('requester_id').notNull(),
  addresseeId: text('addressee_id').notNull(),
  status: text('status').notNull().default('pending'),
}, (t) => [primaryKey({ columns: [t.requesterId, t.addresseeId] })]);

export const calendarFixes = pgTable('calendar_fixes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  summary: text('summary').notNull(),
  changes: jsonb('changes').notNull(),
  days: jsonb('days').notNull().default([]),
  scoreBefore: numeric('score_before', { mode: 'number' }),
  scoreAfter: numeric('score_after', { mode: 'number' }),
  status: text('status').notNull().default('proposed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
});

// Views: other people's safe columns, and the caller's own row.
export const profilePublic = pgView('profile_public', {
  id: text('id').notNull(),
  handle: text('handle').notNull(),
  name: text('name'),
  character: jsonb('character'),
}).existing();

export const schema = { profiles, calendarConnections, events, memories, friendships, calendarFixes, profilePublic };
