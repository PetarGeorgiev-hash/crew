import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`),

  email: varchar('email', { length: 255 }).unique(),
  userName: varchar('user_name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 512 }),

  provider: varchar('provider', { length: 255 }),
  providerId: varchar('provider_id', { length: 255 }),

  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),

  passwordResetTokenHash: varchar('password_reset_token_hash', { length: 255 }),
  passwordResetTokenExpiresAt: timestamp('password_reset_token_expires_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
