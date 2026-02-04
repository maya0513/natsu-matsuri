import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../db/client.js'
import { users, sessions } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../password.js'
import {
  authenticateUser,
  createSession,
  validateSession,
  deleteSession,
  type LoginInput,
} from '../session.js'

describe('Login and Session Management', () => {
  const testUser = {
    email: 'session-test@example.com',
    password: 'secure_password_123',
  }

  let testUserId: string

  beforeEach(async () => {
    // テストユーザーを作成
    const hashResult = await hashPassword(testUser.password)
    if (!hashResult.success) {
      throw new Error('Failed to hash password in test setup')
    }

    const [user] = await db
      .insert(users)
      .values({
        email: testUser.email,
        passwordHash: hashResult.data,
      })
      .returning()

    testUserId = user.id
  })

  afterEach(async () => {
    // クリーンアップ
    await db.delete(sessions).where(eq(sessions.userId, testUserId))
    await db.delete(users).where(eq(users.id, testUserId))
  })

  describe('authenticateUser', () => {
    it('正しい認証情報でユーザーを返す', async () => {
      const input: LoginInput = {
        email: testUser.email,
        password: testUser.password,
      }

      const result = await authenticateUser(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe(testUser.email)
        expect(result.data.id).toBe(testUserId)
        // パスワードハッシュは含まれない
        expect('passwordHash' in result.data).toBe(false)
      }
    })

    it('間違ったパスワードでエラーを返す', async () => {
      const input: LoginInput = {
        email: testUser.email,
        password: 'wrong_password',
      }

      const result = await authenticateUser(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid')
      }
    })

    it('存在しないメールアドレスでエラーを返す', async () => {
      const input: LoginInput = {
        email: 'nonexistent@example.com',
        password: testUser.password,
      }

      const result = await authenticateUser(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid')
      }
    })
  })

  describe('createSession', () => {
    it('ユーザーのセッションを作成できる', async () => {
      const result = await createSession(testUserId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBeDefined()
        expect(result.data.userId).toBe(testUserId)
        expect(result.data.expiresAt).toBeInstanceOf(Date)
        expect(result.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
      }
    })

    it('セッションの有効期限が7日後に設定される', async () => {
      const result = await createSession(testUserId)

      expect(result.success).toBe(true)
      if (result.success) {
        const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const diff = Math.abs(result.data.expiresAt.getTime() - expectedExpiry.getTime())
        // 1秒以内の誤差を許容
        expect(diff).toBeLessThan(1000)
      }
    })
  })

  describe('validateSession', () => {
    it('有効なセッションを検証できる', async () => {
      const createResult = await createSession(testUserId)
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const sessionId = createResult.data.id

      const result = await validateSession(sessionId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user.id).toBe(testUserId)
        expect(result.data.user.email).toBe(testUser.email)
        expect(result.data.session.id).toBe(sessionId)
      }
    })

    it('存在しないセッションでエラーを返す', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000'

      const result = await validateSession(fakeSessionId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid')
      }
    })

    it('期限切れのセッションでエラーを返す', async () => {
      // 期限切れのセッションを作成
      const [expiredSession] = await db
        .insert(sessions)
        .values({
          userId: testUserId,
          expiresAt: new Date(Date.now() - 1000), // 1秒前
        })
        .returning()

      const result = await validateSession(expiredSession.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('expired')
      }
    })
  })

  describe('deleteSession', () => {
    it('セッションを削除できる', async () => {
      const createResult = await createSession(testUserId)
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const sessionId = createResult.data.id

      const result = await deleteSession(sessionId)

      expect(result.success).toBe(true)

      // 削除後、セッションが見つからないことを確認
      const validateResult = await validateSession(sessionId)
      expect(validateResult.success).toBe(false)
    })

    it('存在しないセッションでもエラーにならない', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000'

      const result = await deleteSession(fakeSessionId)

      expect(result.success).toBe(true)
    })
  })
})
