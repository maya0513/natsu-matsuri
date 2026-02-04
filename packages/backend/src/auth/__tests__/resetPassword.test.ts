import { describe, it, expect, beforeEach } from 'vitest'
import { resetPassword } from '../resetPassword.js'
import { db } from '../../db/client.js'
import { users, passwordResetTokens, sessions } from '../../db/schema.js'
import { hashPassword, verifyPassword } from '../password.js'
import {
  generateResetToken,
  hashToken,
  calculateTokenExpiry,
  insertResetToken,
  markTokenAsUsed,
} from '../passwordResetToken.js'
import { eq } from 'drizzle-orm'

describe('resetPassword', () => {
  let testUserId: string
  let testEmail: string

  beforeEach(async () => {
    // テストデータをクリア
    await db.delete(sessions)
    await db.delete(passwordResetTokens)
    await db.delete(users)

    // テストユーザーを作成
    testEmail = 'test@example.com'
    const passwordHash = (await hashPassword('OldPassword123!')).data!
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        passwordHash,
      })
      .returning()

    testUserId = user.id
  })

  it('有効なトークンでパスワードリセットが成功する', async () => {
    // トークンを作成
    const rawToken = generateResetToken()
    const hashedToken = hashToken(rawToken)
    const expiresAt = calculateTokenExpiry()

    await insertResetToken(testUserId, hashedToken, expiresAt)

    // パスワードをリセット
    const result = await resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    })

    expect(result.success).toBe(true)

    // パスワードが更新されたことを確認
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))

    const verifyResult = await verifyPassword('NewPassword123!', user.passwordHash)
    expect(verifyResult.success).toBe(true)
    expect(verifyResult.data).toBe(true)

    // トークンが使用済みになっていることを確認
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, hashedToken))

    expect(token.usedAt).not.toBeNull()
  })

  it('無効なトークンでエラーが返る', async () => {
    const result = await resetPassword({
      token: 'invalid-token',
      newPassword: 'NewPassword123!',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid or expired reset token')
    }
  })

  it('期限切れトークンでエラーが返る', async () => {
    // 期限切れトークンを作成
    const rawToken = generateResetToken()
    const hashedToken = hashToken(rawToken)
    const pastDate = new Date(Date.now() - 1000) // 1秒前

    await insertResetToken(testUserId, hashedToken, pastDate)

    const result = await resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid or expired reset token')
    }
  })

  it('使用済みトークンでエラーが返る（再利用防止）', async () => {
    // トークンを作成して使用済みにマーク
    const rawToken = generateResetToken()
    const hashedToken = hashToken(rawToken)
    const expiresAt = calculateTokenExpiry()

    const insertResult = await insertResetToken(testUserId, hashedToken, expiresAt)
    if (!insertResult.success) throw new Error('Failed to insert token')

    await markTokenAsUsed(insertResult.data.id)

    const result = await resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid or expired reset token')
    }
  })

  it('パスワードリセット後、全セッションが削除される', async () => {
    // セッションを作成
    await db.insert(sessions).values({
      userId: testUserId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    await db.insert(sessions).values({
      userId: testUserId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    // トークンを作成
    const rawToken = generateResetToken()
    const hashedToken = hashToken(rawToken)
    const expiresAt = calculateTokenExpiry()

    await insertResetToken(testUserId, hashedToken, expiresAt)

    // パスワードをリセット
    await resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    })

    // セッションが削除されたことを確認
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, testUserId))

    expect(userSessions).toHaveLength(0)
  })

  it('短すぎる新パスワードでバリデーションエラーが返る', async () => {
    const rawToken = generateResetToken()
    const hashedToken = hashToken(rawToken)
    const expiresAt = calculateTokenExpiry()

    await insertResetToken(testUserId, hashedToken, expiresAt)

    const result = await resetPassword({
      token: rawToken,
      newPassword: 'short',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('at least 8 characters')
    }
  })

  it('空の新パスワードでバリデーションエラーが返る', async () => {
    const result = await resetPassword({
      token: 'some-token',
      newPassword: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('at least 8 characters')
    }
  })

  it('空のトークンでバリデーションエラーが返る', async () => {
    const result = await resetPassword({
      token: '',
      newPassword: 'NewPassword123!',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('required')
    }
  })
})
