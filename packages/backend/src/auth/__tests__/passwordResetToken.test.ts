import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateResetToken,
  hashToken,
  calculateTokenExpiry,
  isTokenExpired,
  isTokenUsed,
  insertResetToken,
  findTokenByHash,
  markTokenAsUsed,
  deleteOldTokensForUser,
} from '../passwordResetToken.js'
import { db } from '../../db/client.js'
import { users, passwordResetTokens } from '../../db/schema.js'
import { hashPassword } from '../password.js'
import { eq } from 'drizzle-orm'

describe('passwordResetToken - 純粋関数', () => {
  describe('generateResetToken', () => {
    it('64文字の16進数文字列を生成する', () => {
      const token = generateResetToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('呼び出すたびに異なるトークンを生成する', () => {
      const token1 = generateResetToken()
      const token2 = generateResetToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashToken', () => {
    it('トークンをSHA-256でハッシュ化する', () => {
      const token = 'a'.repeat(64)
      const hashed = hashToken(token)
      expect(hashed).toHaveLength(64)
      expect(hashed).toMatch(/^[0-9a-f]{64}$/)
    })

    it('同じトークンは同じハッシュになる', () => {
      const token = generateResetToken()
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      expect(hash1).toBe(hash2)
    })

    it('異なるトークンは異なるハッシュになる', () => {
      const token1 = 'a'.repeat(64)
      const token2 = 'b'.repeat(64)
      const hash1 = hashToken(token1)
      const hash2 = hashToken(token2)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('calculateTokenExpiry', () => {
    it('現在時刻から5分後の時刻を返す', () => {
      const before = new Date()
      const expiry = calculateTokenExpiry()
      const after = new Date()

      const expectedMin = new Date(before.getTime() + 5 * 60 * 1000)
      const expectedMax = new Date(after.getTime() + 5 * 60 * 1000)

      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime())
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax.getTime())
    })
  })

  describe('isTokenExpired', () => {
    it('有効期限が過去の場合trueを返す', () => {
      const pastDate = new Date(Date.now() - 1000)
      expect(isTokenExpired(pastDate)).toBe(true)
    })

    it('有効期限が未来の場合falseを返す', () => {
      const futureDate = new Date(Date.now() + 1000)
      expect(isTokenExpired(futureDate)).toBe(false)
    })

    it('有効期限が現在時刻とほぼ同じ場合falseを返す', () => {
      const now = new Date()
      expect(isTokenExpired(now)).toBe(false)
    })
  })

  describe('isTokenUsed', () => {
    it('usedAtがnullの場合falseを返す', () => {
      expect(isTokenUsed(null)).toBe(false)
    })

    it('usedAtが設定されている場合trueを返す', () => {
      const usedDate = new Date()
      expect(isTokenUsed(usedDate)).toBe(true)
    })
  })
})

describe('passwordResetToken - 副作用関数', () => {
  let testUserId: string

  beforeEach(async () => {
    // テストデータをクリア
    await db.delete(passwordResetTokens)
    await db.delete(users)

    // テストユーザーを作成
    const passwordHash = (await hashPassword('TestPassword123!')).data!
    const [user] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        passwordHash,
      })
      .returning()

    testUserId = user.id
  })

  describe('insertResetToken', () => {
    it('トークンをDBに保存できる', async () => {
      const token = generateResetToken()
      const hashedToken = hashToken(token)
      const expiresAt = calculateTokenExpiry()

      const result = await insertResetToken(testUserId, hashedToken, expiresAt)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(testUserId)
        expect(result.data.token).toBe(hashedToken)
        expect(result.data.expiresAt).toEqual(expiresAt)
        expect(result.data.usedAt).toBeNull()
      }
    })

    it('同じハッシュ化トークンは重複して保存できない', async () => {
      const token = generateResetToken()
      const hashedToken = hashToken(token)
      const expiresAt = calculateTokenExpiry()

      await insertResetToken(testUserId, hashedToken, expiresAt)
      const result = await insertResetToken(testUserId, hashedToken, expiresAt)

      expect(result.success).toBe(false)
    })
  })

  describe('findTokenByHash', () => {
    it('ハッシュ化トークンでトークン情報とユーザー情報を取得できる', async () => {
      const token = generateResetToken()
      const hashedToken = hashToken(token)
      const expiresAt = calculateTokenExpiry()

      await insertResetToken(testUserId, hashedToken, expiresAt)

      const result = await findTokenByHash(hashedToken)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.token.token).toBe(hashedToken)
        expect(result.data.token.userId).toBe(testUserId)
        expect(result.data.user.email).toBe('test@example.com')
      }
    })

    it('存在しないトークンの場合failureを返す', async () => {
      const result = await findTokenByHash('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Token not found')
      }
    })
  })

  describe('markTokenAsUsed', () => {
    it('トークンを使用済みにマークできる', async () => {
      const token = generateResetToken()
      const hashedToken = hashToken(token)
      const expiresAt = calculateTokenExpiry()

      const insertResult = await insertResetToken(testUserId, hashedToken, expiresAt)
      if (!insertResult.success) throw new Error('Failed to insert token')

      const tokenId = insertResult.data.id

      const result = await markTokenAsUsed(tokenId)

      expect(result.success).toBe(true)

      // DBから確認
      const [updatedToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.id, tokenId))

      expect(updatedToken.usedAt).not.toBeNull()
    })

    it('存在しないトークンIDの場合failureを返す', async () => {
      const result = await markTokenAsUsed('00000000-0000-0000-0000-000000000000')

      expect(result.success).toBe(false)
    })
  })

  describe('deleteOldTokensForUser', () => {
    it('ユーザーの古い未使用トークンを削除できる', async () => {
      // 3つのトークンを作成
      const token1 = generateResetToken()
      const token2 = generateResetToken()
      const token3 = generateResetToken()

      await insertResetToken(testUserId, hashToken(token1), calculateTokenExpiry())
      await insertResetToken(testUserId, hashToken(token2), calculateTokenExpiry())
      const insertResult3 = await insertResetToken(
        testUserId,
        hashToken(token3),
        calculateTokenExpiry()
      )

      // 3つ目を使用済みにマーク
      if (insertResult3.success) {
        await markTokenAsUsed(insertResult3.data.id)
      }

      const result = await deleteOldTokensForUser(testUserId)

      expect(result.success).toBe(true)

      // 未使用トークンが削除され、使用済みトークンは残っていることを確認
      const remainingTokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId))

      expect(remainingTokens).toHaveLength(1)
      expect(remainingTokens[0].usedAt).not.toBeNull()
    })

    it('他のユーザーのトークンには影響しない', async () => {
      // 別のユーザーを作成
      const passwordHash = (await hashPassword('AnotherPassword123!')).data!
      const [user2] = await db
        .insert(users)
        .values({
          email: 'test2@example.com',
          passwordHash,
        })
        .returning()

      // 各ユーザーにトークンを作成
      await insertResetToken(testUserId, hashToken(generateResetToken()), calculateTokenExpiry())
      await insertResetToken(user2.id, hashToken(generateResetToken()), calculateTokenExpiry())

      await deleteOldTokensForUser(testUserId)

      // user2のトークンは残っていることを確認
      const user2Tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user2.id))

      expect(user2Tokens).toHaveLength(1)
    })
  })
})
