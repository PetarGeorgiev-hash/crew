import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../users/schema/user.schema';

export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MailVerification = typeof emailVerifications.$inferSelect;
export type InsertMailVerification = Omit<
  typeof emailVerifications.$inferInsert,
  'id' | 'createdAt' | 'attempts' | 'lastSentAt'
>;
