import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { verifyPassword } from './password.js'
import { success, failure, type Result } from '../lib/result.js'

/**
 * 副作用関数: ユーザーIDでユーザーを検索
 */
export const findUserById = async (
  userId: string
): Promise<Result<typeof users.$inferSelect, string>> => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      return failure('User not found')
    }

    return success(user)
  } catch (error) {
    return failure('Failed to find user')
  }
}

/**
 * 副作用関数: ユーザーIDとパスワードでパスワードを検証
 * ユーザー検索とパスワード検証を組み合わせた関数
 */
export const verifyUserPasswordById = async (
  userId: string,
  password: string
): Promise<Result<typeof users.$inferSelect, string>> => {
  const userResult = await findUserById(userId)
  if (!userResult.success) {
    return userResult
  }

  const user = userResult.data
  const verifyResult = await verifyPassword(password, user.passwordHash)

  if (!verifyResult.success || !verifyResult.data) {
    return failure('Invalid password')
  }

  return success(user)
}
