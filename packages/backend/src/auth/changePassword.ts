import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { hashPassword } from './password.js'
import { success, failure, type Result } from '../lib/result.js'
import { validate } from '../lib/validation.js'
import { deleteAllUserSessions } from './session.js'
import { findUserById, verifyUserPasswordById } from './user.js'

/**
 * パスワード変更入力スキーマ
 */
const changePasswordSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * 純粋関数: バリデーション
 */
const validateChangePasswordInput = (
  input: ChangePasswordInput
): Result<ChangePasswordInput, string> => {
  return validate(changePasswordSchema, input)
}

/**
 * 副作用関数: パスワード更新
 */
export const updateUserPassword = async (
  userId: string,
  newPassword: string
): Promise<Result<void, string>> => {
  const hashResult = await hashPassword(newPassword)
  if (!hashResult.success) {
    return failure('Failed to hash password')
  }

  try {
    await db.update(users).set({ passwordHash: hashResult.data }).where(eq(users.id, userId))
    return success(undefined)
  } catch (error) {
    return failure('Failed to update password')
  }
}

/**
 * メイン関数: パスワード変更フロー
 * 1. バリデーション
 * 2. ユーザー検索と現在のパスワード検証
 * 3. 新しいパスワードでDB更新
 * 4. 全セッション削除
 */
export const changePassword = async (
  input: ChangePasswordInput
): Promise<Result<void, string>> => {
  // 1. バリデーション
  const validationResult = validateChangePasswordInput(input)
  if (!validationResult.success) {
    return validationResult
  }

  const validatedInput = validationResult.data

  // 2. ユーザー検索と現在のパスワード検証
  const verifyResult = await verifyUserPasswordById(
    validatedInput.userId,
    validatedInput.currentPassword
  )
  if (!verifyResult.success) {
    return verifyResult
  }

  // 3. 新しいパスワードでDB更新
  const updateResult = await updateUserPassword(validatedInput.userId, validatedInput.newPassword)
  if (!updateResult.success) {
    return updateResult
  }

  // 4. 全セッション削除
  return await deleteAllUserSessions(validatedInput.userId)
}
