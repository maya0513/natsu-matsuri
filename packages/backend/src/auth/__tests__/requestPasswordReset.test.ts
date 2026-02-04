import { describe, it, expect, beforeEach } from 'vitest'
import { requestPasswordReset } from '../requestPasswordReset.js'
import { MockEmailService } from '../../lib/email.js'
import { db } from '../../db/client.js'
import { users, passwordResetTokens } from '../../db/schema.js'
import { hashPassword } from '../password.js'
import { eq } from 'drizzle-orm'

describe('requestPasswordReset', () => {
  let emailService: MockEmailService

  beforeEach(async () => {
    emailService = new MockEmailService()

    // テストデータをクリア
    await db.delete(passwordResetTokens)
    await db.delete(users)
  })

  it('有効なメールアドレスでリセット要求が成功する', async () => {
    // テストユーザーを作成
    const passwordHash = (await hashPassword('TestPassword123!')).data!
    await db.insert(users).values({
      email: 'test@example.com',
      passwordHash,
    })

    const result = await requestPasswordReset(
      { email: 'test@example.com' },
      emailService
    )

    expect(result.success).toBe(true)

    // メールが送信されたことを確認
    expect(emailService.sentEmails).toHaveLength(1)
    expect(emailService.sentEmails[0].email).toBe('test@example.com')
    expect(emailService.sentEmails[0].token).toHaveLength(64)

    // トークンがDBに保存されたことを確認
    const tokens = await db
      .select()
      .from(passwordResetTokens)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].usedAt).toBeNull()
  })

  it('存在しないメールアドレスでも成功を返す（タイミング攻撃対策）', async () => {
    const result = await requestPasswordReset(
      { email: 'nonexistent@example.com' },
      emailService
    )

    expect(result.success).toBe(true)

    // メールは送信されない
    expect(emailService.sentEmails).toHaveLength(0)

    // トークンも作成されない
    const tokens = await db.select().from(passwordResetTokens)
    expect(tokens).toHaveLength(0)
  })

  it('複数回要求すると古い未使用トークンが削除される', async () => {
    // テストユーザーを作成
    const passwordHash = (await hashPassword('TestPassword123!')).data!
    await db.insert(users).values({
      email: 'test@example.com',
      passwordHash,
    })

    // 1回目のリセット要求
    await requestPasswordReset({ email: 'test@example.com' }, emailService)

    // 2回目のリセット要求
    await requestPasswordReset({ email: 'test@example.com' }, emailService)

    // トークンは1つだけ（古いものは削除されている）
    const tokens = await db.select().from(passwordResetTokens)
    expect(tokens).toHaveLength(1)

    // メールは2回送信されている
    expect(emailService.sentEmails).toHaveLength(2)
    // トークンは異なる
    expect(emailService.sentEmails[0].token).not.toBe(emailService.sentEmails[1].token)
  })

  it('無効なメールアドレスでバリデーションエラーが返る', async () => {
    const result = await requestPasswordReset(
      { email: 'invalid-email' },
      emailService
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid email')
    }

    // メールは送信されない
    expect(emailService.sentEmails).toHaveLength(0)
  })

  it('空のメールアドレスでバリデーションエラーが返る', async () => {
    const result = await requestPasswordReset(
      { email: '' },
      emailService
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid email')
    }
  })
})
