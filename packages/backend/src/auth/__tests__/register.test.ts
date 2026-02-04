import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../db/client.js'
import { users } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import {
  validateRegistrationInput,
  createUser,
  type RegistrationInput,
} from '../register.js'

describe('User Registration', () => {
  describe('validateRegistrationInput', () => {
    it('有効な入力を受け入れる', () => {
      const input: RegistrationInput = {
        email: 'test@example.com',
        password: 'secure_password_123',
      }

      const result = validateRegistrationInput(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('secure_password_123')
      }
    })

    it('無効なメールアドレスを拒否する', () => {
      const input: RegistrationInput = {
        email: 'invalid-email',
        password: 'secure_password_123',
      }

      const result = validateRegistrationInput(input)

      expect(result.success).toBe(false)
    })

    it('短すぎるパスワードを拒否する', () => {
      const input: RegistrationInput = {
        email: 'test@example.com',
        password: 'short',
      }

      const result = validateRegistrationInput(input)

      expect(result.success).toBe(false)
    })

    it('空のメールアドレスを拒否する', () => {
      const input: RegistrationInput = {
        email: '',
        password: 'secure_password_123',
      }

      const result = validateRegistrationInput(input)

      expect(result.success).toBe(false)
    })
  })

  describe('createUser', () => {
    beforeEach(async () => {
      // テスト用ユーザーをクリーンアップ
      await db.delete(users).where(eq(users.email, 'newuser@example.com'))
    })

    afterEach(async () => {
      // テスト後のクリーンアップ
      await db.delete(users).where(eq(users.email, 'newuser@example.com'))
    })

    it('新しいユーザーを作成できる', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'secure_password_123',
      }

      const result = await createUser(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('newuser@example.com')
        expect(result.data.id).toBeDefined()
        expect(result.data.createdAt).toBeDefined()
        // パスワードハッシュは含まれない
        expect('passwordHash' in result.data).toBe(false)
      }
    })

    it('重複したメールアドレスでエラーを返す', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'secure_password_123',
      }

      // 最初のユーザー作成
      await createUser(input)

      // 同じメールアドレスで再度作成
      const result = await createUser(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('already exists')
      }
    })

    it('無効な入力でエラーを返す', async () => {
      const input = {
        email: 'invalid-email',
        password: 'short',
      }

      const result = await createUser(input)

      expect(result.success).toBe(false)
    })
  })
})
