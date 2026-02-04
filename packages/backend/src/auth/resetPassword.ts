import { z } from 'zod'
import { success, failure, type Result } from '../lib/result.js'
import { validate } from '../lib/validation.js'
import {
  hashToken,
  findTokenByHash,
  isTokenExpired,
  isTokenUsed,
  markTokenAsUsed,
} from './passwordResetToken.js'
import { updateUserPassword } from './changePassword.js'
import { deleteAllUserSessions } from './session.js'

/**
 * パスワードリセット実行入力スキーマ
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * メイン関数: パスワードリセット実行フロー
 * 1. バリデーション
 * 2. トークンをハッシュ化してDB検索
 * 3. トークンの有効性チェック（期限切れ・使用済み）
 * 4. 新パスワードをハッシュ化
 * 5. パスワード更新
 * 6. トークンを使用済みにマーク
 * 7. すべてのセッションを削除
 */
export const resetPassword = async (
  input: ResetPasswordInput
): Promise<Result<void, string>> => {
  // 1. バリデーション
  const validationResult = validate(resetPasswordSchema, input)
  if (!validationResult.success) {
    return validationResult
  }

  const { token, newPassword } = validationResult.data

  // 2. トークンをハッシュ化してDB検索
  const hashedToken = hashToken(token)
  const tokenResult = await findTokenByHash(hashedToken)

  if (!tokenResult.success) {
    return failure('Invalid or expired reset token')
  }

  const { token: resetToken, user } = tokenResult.data

  // 3. トークンの有効性チェック
  if (isTokenExpired(resetToken.expiresAt)) {
    return failure('Invalid or expired reset token')
  }

  if (isTokenUsed(resetToken.usedAt)) {
    return failure('Invalid or expired reset token')
  }

  // 5. パスワード更新
  const updateResult = await updateUserPassword(user.id, newPassword)
  if (!updateResult.success) {
    return updateResult
  }

  // 6. トークンを使用済みにマーク
  const markResult = await markTokenAsUsed(resetToken.id)
  if (!markResult.success) {
    return markResult
  }

  // 7. すべてのセッションを削除
  return await deleteAllUserSessions(user.id)
}
