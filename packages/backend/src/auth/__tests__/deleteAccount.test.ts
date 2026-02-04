import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../db/client.js'
import { users, sessions } from '../../db/schema.js'
import { deleteAccount, type DeleteAccountInput } from '../deleteAccount.js'
import { hashPassword } from '../password.js'
import { createSession } from '../session.js'
import { eq } from 'drizzle-orm'

describe('Account Deletion', () => {
  // テスト用ユーザー
  const testUser = {
    email: 'deleteaccount@example.com',
    password: 'password123',
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

  describe('deleteAccount', () => {
    it('正しいパスワードでアカウント削除できる', async () => {
      const input: DeleteAccountInput = {
        userId,
        password: testUser.password,
      }

      const result = await deleteAccount(input)

      expect(result.success).toBe(true)

      // ユーザーが削除されたことを確認
      const deletedUser = await db.select().from(users).where(eq(users.id, userId))
      expect(deletedUser).toHaveLength(0)
    })

    it('間違ったパスワードでエラーを返す', async () => {
      const input: DeleteAccountInput = {
        userId,
        password: 'wrongpassword',
      }

      const result = await deleteAccount(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid')
      }

      // ユーザーが削除されていないことを確認
      const user = await db.select().from(users).where(eq(users.id, userId))
      expect(user).toHaveLength(1)
    })

    it('アカウント削除後、関連セッションも削除される（カスケード）', async () => {
      // セッションを作成
      await createSession(userId)
      await createSession(userId)

      // セッションが作成されたことを確認
      const sessionsBefore = await db.select().from(sessions).where(eq(sessions.userId, userId))
      expect(sessionsBefore).toHaveLength(2)

      const input: DeleteAccountInput = {
        userId,
        password: testUser.password,
      }

      const result = await deleteAccount(input)
      expect(result.success).toBe(true)

      // セッションも削除されたことを確認（カスケード）
      const sessionsAfter = await db.select().from(sessions).where(eq(sessions.userId, userId))
      expect(sessionsAfter).toHaveLength(0)
    })

    it('削除後、削除されたメールで登録できる', async () => {
      const input: DeleteAccountInput = {
        userId,
        password: testUser.password,
      }

      await deleteAccount(input)

      // 同じメールで新しいユーザーを作成できることを確認
      const hashResult = await hashPassword('newpassword123')
      if (!hashResult.success) {
        throw new Error('Failed to hash password')
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email: testUser.email,
          passwordHash: hashResult.data,
        })
        .returning()

      expect(newUser.email).toBe(testUser.email)
      expect(newUser.id).not.toBe(userId)
    })

    it('存在しないユーザーでエラーを返す', async () => {
      const input: DeleteAccountInput = {
        userId: 'non-existent-user-id',
        password: testUser.password,
      }

      const result = await deleteAccount(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeTruthy()
      }
    })

    it('パスワードが空の場合エラー', async () => {
      const input: DeleteAccountInput = {
        userId,
        password: '',
      }

      const result = await deleteAccount(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })
  })
})
