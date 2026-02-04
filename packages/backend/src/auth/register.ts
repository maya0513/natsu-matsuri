import { z } from 'zod'
import { db } from '../db/client.js'
import { users, type User } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword } from './password.js'
import { type Result, success, failure, flatMapResultAsync } from '../lib/result.js'
import { validate } from '../lib/validation.js'

// スキーマ定義
const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type UserResponse = Omit<User, 'passwordHash'>

/**
 * 登録入力をバリデーションする純粋関数
 */
export const validateRegistrationInput = (
  input: RegistrationInput
): Result<RegistrationInput, string> => {
  return validate(registrationSchema, input)
}

/**
 * ユーザーが既に存在するかチェックする関数（副作用あり）
 */
const checkUserExists = async (email: string): Promise<Result<boolean, string>> => {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    return success(!!existingUser)
  } catch (error) {
    return failure('Failed to check existing user')
  }
}

/**
 * パスワードハッシュを除外したユーザーレスポンスを作成する純粋関数
 */
const createUserResponse = (user: User): UserResponse => {
  const { passwordHash: _, ...userResponse } = user
  return userResponse
}

/**
 * データベースにユーザーを挿入する関数（副作用あり）
 */
const insertUser = async (
  email: string,
  passwordHash: string
): Promise<Result<User, string>> => {
  try {
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
      })
      .returning()

    return success(newUser)
  } catch (error) {
    return failure('Failed to create user')
  }
}

/**
 * ユーザーをデータベースに作成する
 * @param input - 登録入力
 * @returns 作成されたユーザー情報またはエラー
 */
export const createUser = async (
  input: RegistrationInput
): Promise<Result<UserResponse, string>> => {
  // バリデーション
  const validationResult = validateRegistrationInput(input)
  if (!validationResult.success) {
    return validationResult
  }

  const { email, password } = validationResult.data

  // 既存ユーザーチェック
  const existsResult = await checkUserExists(email)
  if (!existsResult.success) {
    return existsResult
  }

  if (existsResult.data) {
    return failure('User with this email already exists')
  }

  // パスワードハッシュ化 → ユーザー作成（関数合成）
  const hashResult = await hashPassword(password)

  return flatMapResultAsync(hashResult, async (passwordHash) => {
    const userResult = await insertUser(email, passwordHash)
    if (!userResult.success) {
      return userResult
    }
    return success(createUserResponse(userResult.data))
  })
}
