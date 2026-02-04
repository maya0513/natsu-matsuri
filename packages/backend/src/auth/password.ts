import { hash, verify } from '@node-rs/bcrypt'
import { type Result, success, failure } from '../lib/result.js'

const SALT_ROUNDS = 12

/**
 * パスワードが空でないかを検証する純粋関数
 */
const validatePasswordNotEmpty = (password: string): Result<string, string> => {
  if (!password || password.trim().length === 0) {
    return failure('Password cannot be empty')
  }
  return success(password)
}

/**
 * パスワードをハッシュ化する関数（副作用あり）
 * @param password - ハッシュ化するパスワード
 * @returns ハッシュ化されたパスワードまたはエラー
 */
export const hashPassword = async (password: string): Promise<Result<string, string>> => {
  const validation = validatePasswordNotEmpty(password)
  if (!validation.success) {
    return validation
  }

  try {
    const hashed = await hash(password, SALT_ROUNDS)
    return success(hashed)
  } catch (error) {
    return failure('Failed to hash password')
  }
}

/**
 * パスワードを検証する関数（副作用あり）
 * @param password - 検証するパスワード
 * @param passwordHash - 保存されたハッシュ
 * @returns パスワードが一致する場合true、それ以外falseまたはエラー
 */
export const verifyPassword = async (
  password: string,
  passwordHash: string
): Promise<Result<boolean, string>> => {
  const validation = validatePasswordNotEmpty(password)
  if (!validation.success) {
    return failure(validation.error)
  }

  try {
    const isValid = await verify(password, passwordHash)
    return success(isValid)
  } catch (error) {
    return failure('Failed to verify password')
  }
}
