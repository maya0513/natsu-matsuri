import { z } from 'zod'
import { success, failure, type Result } from '../lib/result.js'
import { validate } from '../lib/validation.js'
import type { EmailService } from '../lib/email.js'
import {
  generateResetToken,
  hashToken,
  calculateTokenExpiry,
  insertResetToken,
  deleteOldTokensForUser,
} from './passwordResetToken.js'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

/**
 * パスワードリセット要求入力スキーマ
 */
const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>

/**
 * 副作用関数: メールアドレスでユーザーを検索
 */
const findUserByEmail = async (
  email: string
): Promise<Result<{ id: string; email: string }, string>> => {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return failure('User not found')
    }

    return success(user)
  } catch (error) {
    return failure('Failed to find user')
  }
}

/**
 * メイン関数: パスワードリセット要求フロー
 * 1. バリデーション
 * 2. ユーザー検索（存在しない場合も成功を返す - タイミング攻撃対策）
 * 3. 既存の未使用トークンを削除
 * 4. 新しいトークンを生成
 * 5. ハッシュ化トークンをDBに保存
 * 6. 生トークンをメールで送信
 */
export const requestPasswordReset = async (
  input: RequestPasswordResetInput,
  emailService: EmailService
): Promise<Result<void, string>> => {
  // 1. バリデーション
  const validationResult = validate(requestPasswordResetSchema, input)
  if (!validationResult.success) {
    return validationResult
  }

  const { email } = validationResult.data

  // 2. ユーザー検索
  const userResult = await findUserByEmail(email)

  // タイミング攻撃対策: ユーザーが存在しない場合でも成功を返す
  if (!userResult.success) {
    return success(undefined)
  }

  const user = userResult.data

  // 3. 既存の未使用トークンを削除
  await deleteOldTokensForUser(user.id)

  // 4. 新しいトークンを生成
  const rawToken = generateResetToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = calculateTokenExpiry()

  // 5. ハッシュ化トークンをDBに保存
  const insertResult = await insertResetToken(user.id, hashedToken, expiresAt)
  if (!insertResult.success) {
    return failure('Failed to create reset token')
  }

  // 6. 生トークンをメールで送信
  await emailService.sendPasswordResetEmail(email, rawToken)

  return success(undefined)
}
