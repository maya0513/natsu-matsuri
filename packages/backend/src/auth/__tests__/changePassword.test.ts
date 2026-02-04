import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../db/client.js'
import { users, sessions } from '../../db/schema.js'
import { changePassword, type ChangePasswordInput } from '../changePassword.js'
import { hashPassword } from '../password.js'
import { createSession } from '../session.js'
import { eq } from 'drizzle-orm'

describe('Password Change', () => {
  // テスト用ユーザー
  const testUser = {
    email: 'changepassword@example.com',
    password: 'oldpassword123',
  }

  let userId: string

  beforeEach(async () => {
    // テストユーザーを作成
    const hashResult = await hashPassword(testUser.password)
    if (!hashResult.success) {
      throw new Error('Failed to hash password')
    }
    const [user] = await db
      .insert(users)
      .values({
        email: testUser.email,
        passwordHash: hashResult.data,
      })
      .returning()
    userId = user.id
  })

  afterEach(async () => {
    // クリーンアップ
    await db.delete(sessions)
    await db.delete(users)
  })

  describe('changePassword', () => {
    it('正しいパスワードでパスワード変更できる', async () => {
      const input: ChangePasswordInput = {
        userId,
        currentPassword: testUser.password,
        newPassword: 'newpassword123',
      }

      const result = await changePassword(input)

      expect(result.success).toBe(true)
    })

    it('間違った現在のパスワードでエラーを返す', async () => {
      const input: ChangePasswordInput = {
        userId,
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      }

      const result = await changePassword(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid')
      }
    })

    it('パスワード変更後、全セッションが削除される', async () => {
      // 2つのセッションを作成
      await createSession(userId)
      await createSession(userId)

      // セッションが作成されたことを確認
      const sessionsBefore = await db.select().from(sessions).where(eq(sessions.userId, userId))
      expect(sessionsBefore).toHaveLength(2)

      const input: ChangePasswordInput = {
        userId,
        currentPassword: testUser.password,
        newPassword: 'newpassword123',
      }

      const result = await changePassword(input)
      expect(result.success).toBe(true)

      // セッションが削除されたことを確認
      const sessionsAfter = await db.select().from(sessions).where(eq(sessions.userId, userId))
      expect(sessionsAfter).toHaveLength(0)
    })

    it('存在しないユーザーでエラーを返す', async () => {
      const input: ChangePasswordInput = {
        userId: 'non-existent-user-id',
        currentPassword: testUser.password,
        newPassword: 'newpassword123',
      }

      const result = await changePassword(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeTruthy()
      }
    })

    it('新しいパスワードが8文字未満の場合エラー', async () => {
      const input: ChangePasswordInput = {
        userId,
        currentPassword: testUser.password,
        newPassword: 'short',
      }

      const result = await changePassword(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('8 characters')
      }
    })

    it('現在のパスワードが空の場合エラー', async () => {
      const input: ChangePasswordInput = {
        userId,
        currentPassword: '',
        newPassword: 'newpassword123',
      }

      const result = await changePassword(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })
  })
})
