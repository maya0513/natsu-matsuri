import crypto from 'node:crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/client.js'
import { passwordResetTokens, users } from '../db/schema.js'
import { success, failure, type Result } from '../lib/result.js'
import type { PasswordResetToken, User } from '../db/schema.js'

/**
 * 純粋関数: 64文字の暗号学的に安全なランダムトークンを生成
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 純粋関数: トークンをSHA-256でハッシュ化（DB保存用）
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * 純粋関数: トークンの有効期限を計算（5分）
 */
export const calculateTokenExpiry = (): Date => {
  return new Date(Date.now() + 5 * 60 * 1000) // 5分
}

/**
 * 純粋関数: トークンが期限切れかチェック
 */
export const isTokenExpired = (expiresAt: Date): boolean => {
  return expiresAt.getTime() < Date.now()
}

/**
 * 純粋関数: トークンが使用済みかチェック
 */
export const isTokenUsed = (usedAt: Date | null): boolean => {
  return usedAt !== null
}

/**
 * 副作用関数: リセットトークンをDBに保存
 */
export const insertResetToken = async (
  userId: string,
  hashedToken: string,
  expiresAt: Date
): Promise<Result<PasswordResetToken, string>> => {
  try {
    const [token] = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token: hashedToken,
        expiresAt,
      })
      .returning()

    return success(token)
  } catch (error) {
    return failure('Failed to insert reset token')
  }
}

/**
 * 副作用関数: ハッシュ化されたトークンでDB検索（ユーザー情報も取得）
 */
export const findTokenByHash = async (
  hashedToken: string
): Promise<Result<{ token: PasswordResetToken; user: User }, string>> => {
  try {
    const result = await db
      .select({
        token: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.token, hashedToken))
      .limit(1)

    if (result.length === 0) {
      return failure('Token not found')
    }

    return success(result[0])
  } catch (error) {
    return failure('Failed to find token')
  }
}

/**
 * 副作用関数: トークンを使用済みにマーク
 */
export const markTokenAsUsed = async (tokenId: string): Promise<Result<void, string>> => {
  try {
    const result = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId))
      .returning()

    if (result.length === 0) {
      return failure('Token not found')
    }

    return success(undefined)
  } catch (error) {
    return failure('Failed to mark token as used')
  }
}

/**
 * 副作用関数: ユーザーの古い未使用トークンを削除
 */
export const deleteOldTokensForUser = async (userId: string): Promise<Result<void, string>> => {
  try {
    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))

    return success(undefined)
  } catch (error) {
    return failure('Failed to delete old tokens')
  }
}
