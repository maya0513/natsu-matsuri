import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { success, failure, type Result } from '../lib/result.js'
import { validate } from '../lib/validation.js'
import { verifyUserPasswordById } from './user.js'

/**
 * アカウント削除入力スキーマ
 */
const deleteAccountSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1, 'Password is required'),
})

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>

/**
 * 純粋関数: バリデーション
 */
const validateDeleteAccountInput = (
  input: DeleteAccountInput
): Result<DeleteAccountInput, string> => {
  return validate(deleteAccountSchema, input)
}

/**
 * 副作用関数: ユーザー削除（セッションはカスケード削除）
 */
const deleteUserById = async (userId: string): Promise<Result<void, string>> => {
  try {
    await db.delete(users).where(eq(users.id, userId))
    return success(undefined)
  } catch (error) {
    return failure('Failed to delete user')
  }
}

/**
 * メイン関数: アカウント削除フロー
 * 1. バリデーション
 * 2. ユーザー検索とパスワード検証
 * 3. ユーザー削除（DBのonDelete: cascadeでセッションも自動削除）
 */
export const deleteAccount = async (
  input: DeleteAccountInput
): Promise<Result<void, string>> => {
  // 1. バリデーション
  const validationResult = validateDeleteAccountInput(input)
  if (!validationResult.success) {
    return validationResult
  }

  const validatedInput = validationResult.data

  // 2. ユーザー検索とパスワード検証
  const verifyResult = await verifyUserPasswordById(validatedInput.userId, validatedInput.password)
  if (!verifyResult.success) {
    return verifyResult
  }

  // 3. ユーザー削除（セッションは自動削除）
  return await deleteUserById(validatedInput.userId)
}
