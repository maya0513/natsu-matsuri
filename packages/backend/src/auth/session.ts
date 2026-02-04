import { z } from 'zod'
import { db } from '../db/client.js'
import { users, sessions, type Session } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './password.js'
import { type Result, success, failure, flatMapResultAsync } from '../lib/result.js'
import { validate } from '../lib/validation.js'
import type { UserResponse } from './register.js'

// スキーマ定義
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// セッション有効期限（7日間）
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * パスワードハッシュを除外したユーザーレスポンスを作成する純粋関数
 */
const createUserResponse = (user: {
  id: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}): UserResponse => {
  const { passwordHash: _, ...userResponse } = user
  return userResponse
}

/**
 * セッションの有効期限を計算する純粋関数
 */
const calculateSessionExpiry = (): Date => {
  return new Date(Date.now() + SESSION_DURATION_MS)
}

/**
 * メールアドレスでユーザーを検索する関数（副作用あり）
 */
const findUserByEmail = async (email: string): Promise<Result<UserResponse & { passwordHash: string }, string>> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      return failure('Invalid email or password')
    }

    return success(user)
  } catch (error) {
    return failure('Authentication failed')
  }
}

/**
 * ユーザー認証を行う
 */
export const authenticateUser = async (
  input: LoginInput
): Promise<Result<UserResponse, string>> => {
  // バリデーション
  const validationResult = validate(loginSchema, input)
  if (!validationResult.success) {
    return validationResult
  }

  const { email, password } = validationResult.data

  // ユーザー検索
  const userResult = await findUserByEmail(email)
  if (!userResult.success) {
    return userResult
  }

  const user = userResult.data

  // パスワード検証
  const passwordResult = await verifyPassword(password, user.passwordHash)
  if (!passwordResult.success) {
    return failure('Authentication failed')
  }

  if (!passwordResult.data) {
    return failure('Invalid email or password')
  }

  return success(createUserResponse(user))
}

/**
 * セッションを作成する
 */
export const createSession = async (userId: string): Promise<Result<Session, string>> => {
  try {
    const expiresAt = calculateSessionExpiry()

    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        expiresAt,
      })
      .returning()

    return success(session)
  } catch (error) {
    return failure('Failed to create session')
  }
}

/**
 * セッションを検索する関数（副作用あり）
 */
const findSessionById = async (
  sessionId: string
): Promise<Result<Session & { user: UserResponse & { passwordHash: string } }, string>> => {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        user: true,
      },
    })

    if (!session) {
      return failure('Invalid session')
    }

    return success(session)
  } catch (error) {
    return failure('Failed to validate session')
  }
}

/**
 * セッションが期限切れかチェックする純粋関数
 */
const isSessionExpired = (expiresAt: Date): boolean => {
  return expiresAt < new Date()
}

/**
 * セッションを削除する関数（副作用あり）
 */
const deleteSessionById = async (sessionId: string): Promise<Result<void, string>> => {
  try {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    return success(undefined)
  } catch (error) {
    return failure('Failed to delete session')
  }
}

/**
 * セッションを検証する
 */
export const validateSession = async (
  sessionId: string
): Promise<Result<{ user: UserResponse; session: Session }, string>> => {
  // セッション検索
  const sessionResult = await findSessionById(sessionId)
  if (!sessionResult.success) {
    return sessionResult
  }

  const session = sessionResult.data

  // 期限切れチェック
  if (isSessionExpired(session.expiresAt)) {
    await deleteSessionById(sessionId)
    return failure('Session has expired')
  }

  return success({
    user: createUserResponse(session.user),
    session,
  })
}

/**
 * セッションを削除する（ログアウト）
 */
export const deleteSession = async (sessionId: string): Promise<Result<void, string>> => {
  return deleteSessionById(sessionId)
}

/**
 * ユーザーの全セッションを削除する（パスワード変更時のセキュリティ対策）
 */
export const deleteAllUserSessions = async (userId: string): Promise<Result<void, string>> => {
  try {
    await db.delete(sessions).where(eq(sessions.userId, userId))
    return success(undefined)
  } catch (error) {
    return failure('Failed to delete sessions')
  }
}
