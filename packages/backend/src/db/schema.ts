import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // SHA-256ハッシュ化されたトークン
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'), // NULL = 未使用, NOT NULL = 使用済み
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}))

export const usersRelationsExtended = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert
