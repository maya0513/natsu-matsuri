import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password.js'

describe('Password hashing', () => {
  describe('hashPassword', () => {
    it('パスワードをハッシュ化できる', async () => {
      const password = 'secure_password_123'
      const result = await hashPassword(password)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
        expect(result.data).not.toBe(password)
        expect(result.data.length).toBeGreaterThan(0)
      }
    })

    it('同じパスワードでも異なるハッシュを生成する（salt使用）', async () => {
      const password = 'same_password'
      const result1 = await hashPassword(password)
      const result2 = await hashPassword(password)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      if (result1.success && result2.success) {
        expect(result1.data).not.toBe(result2.data)
      }
    })

    it('空のパスワードは拒否する', async () => {
      const result = await hashPassword('')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('empty')
      }
    })
  })

  describe('verifyPassword', () => {
    it('正しいパスワードでtrueを返す', async () => {
      const password = 'correct_password'
      const hashResult = await hashPassword(password)
      expect(hashResult.success).toBe(true)
      if (!hashResult.success) return

      const verifyResult = await verifyPassword(password, hashResult.data)

      expect(verifyResult.success).toBe(true)
      if (verifyResult.success) {
        expect(verifyResult.data).toBe(true)
      }
    })

    it('間違ったパスワードでfalseを返す', async () => {
      const password = 'correct_password'
      const wrongPassword = 'wrong_password'
      const hashResult = await hashPassword(password)
      expect(hashResult.success).toBe(true)
      if (!hashResult.success) return

      const verifyResult = await verifyPassword(wrongPassword, hashResult.data)

      expect(verifyResult.success).toBe(true)
      if (verifyResult.success) {
        expect(verifyResult.data).toBe(false)
      }
    })

    it('空のパスワードは拒否する', async () => {
      const hashResult = await hashPassword('valid_password')
      expect(hashResult.success).toBe(true)
      if (!hashResult.success) return

      const verifyResult = await verifyPassword('', hashResult.data)

      expect(verifyResult.success).toBe(false)
      if (!verifyResult.success) {
        expect(verifyResult.error).toContain('empty')
      }
    })
  })
})
