import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../db/client.js'
import { users, sessions, passwordResetTokens } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { createApp } from '../../app.js'

describe('Auth API Endpoints', () => {
  const app = createApp()

  const testUser = {
    email: 'api-test@example.com',
    password: 'secure_password_123',
  }

  beforeEach(async () => {
    // クリーンアップ
    await db.delete(sessions)
    await db.delete(users).where(eq(users.email, testUser.email))
  })

  afterEach(async () => {
    // クリーンアップ
    await db.delete(sessions)
    await db.delete(users).where(eq(users.email, testUser.email))
  })

  describe('POST /api/auth/register', () => {
    it('新しいユーザーを登録できる', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(201)

      const data = await res.json()
      expect(data.user.email).toBe(testUser.email)
      expect(data.user.id).toBeDefined()
      expect(data.user).not.toHaveProperty('passwordHash')
    })

    it('無効なメールアドレスでエラーを返す', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'secure_password_123',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('重複したメールアドレスでエラーを返す', async () => {
      // 最初の登録
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      // 重複登録
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // テストユーザーを登録
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })
    })

    it('正しい認証情報でログインできる', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.user.email).toBe(testUser.email)

      // Cookieにセッションが設定される
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toBeDefined()
      expect(cookies).toContain('session_id=')
    })

    it('間違ったパスワードでエラーを返す', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'wrong_password',
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    let sessionId: string

    beforeEach(async () => {
      // テストユーザーを登録してログイン
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const cookies = loginRes.headers.get('Set-Cookie')
      const match = cookies?.match(/session_id=([^;]+)/)
      sessionId = match?.[1] || ''
    })

    it('認証されたユーザー情報を取得できる', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.user.email).toBe(testUser.email)
    })

    it('セッションがない場合はエラーを返す', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
      })

      expect(res.status).toBe(401)
    })

    it('無効なセッションでエラーを返す', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: 'session_id=invalid-session-id',
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    let sessionId: string

    beforeEach(async () => {
      // テストユーザーを登録してログイン
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const cookies = loginRes.headers.get('Set-Cookie')
      const match = cookies?.match(/session_id=([^;]+)/)
      sessionId = match?.[1] || ''
    })

    it('ログアウトできる', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })

      expect(res.status).toBe(200)

      // Cookieが削除される
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('session_id=;')
      expect(cookies).toContain('Max-Age=0')

      // ログアウト後はセッションが無効
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })

      expect(meRes.status).toBe(401)
    })
  })

  describe('POST /api/auth/change-password', () => {
    let sessionId: string

    beforeEach(async () => {
      // テストユーザーを登録してログイン
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const cookies = loginRes.headers.get('Set-Cookie')
      const match = cookies?.match(/session_id=([^;]+)/)
      sessionId = match?.[1] || ''
    })

    it('認証済みユーザーがパスワード変更できる', async () => {
      const res = await app.request('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          currentPassword: testUser.password,
          newPassword: 'new_secure_password_123',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('successfully')

      // セッションがクリアされている
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('session_id=;')

      // 旧セッションが無効になっている
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })
      expect(meRes.status).toBe(401)

      // 新しいパスワードでログインできる
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'new_secure_password_123',
        }),
      })
      expect(loginRes.status).toBe(200)
    })

    it('現在のパスワードが間違っている場合401エラー', async () => {
      const res = await app.request('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          currentPassword: 'wrong_password',
          newPassword: 'new_secure_password_123',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBeTruthy()
    })

    it('セッションがない場合401エラー', async () => {
      const res = await app.request('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: testUser.password,
          newPassword: 'new_secure_password_123',
        }),
      })

      expect(res.status).toBe(401)
    })

    it('新しいパスワードが8文字未満の場合400エラー', async () => {
      const res = await app.request('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          currentPassword: testUser.password,
          newPassword: 'short',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      // OpenAPIバリデーションエラーの構造をチェック
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.issues).toBeDefined()
      expect(data.error.issues[0].message).toContain('8')
    })
  })

  describe('DELETE /api/auth/account', () => {
    let sessionId: string

    beforeEach(async () => {
      // テストユーザーを登録してログイン
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const cookies = loginRes.headers.get('Set-Cookie')
      const match = cookies?.match(/session_id=([^;]+)/)
      sessionId = match?.[1] || ''
    })

    it('認証済みユーザーがアカウント削除できる', async () => {
      const res = await app.request('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          password: testUser.password,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('successfully')

      // セッションがクリアされている
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('session_id=;')

      // 削除されたメールでログインできない
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })
      expect(loginRes.status).toBe(401)
    })

    it('パスワードが間違っている場合401エラー', async () => {
      const res = await app.request('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          password: 'wrong_password',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBeTruthy()

      // ユーザーは削除されていない（まだログインできる）
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })
      expect(meRes.status).toBe(200)
    })

    it('セッションがない場合401エラー', async () => {
      const res = await app.request('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: testUser.password,
        }),
      })

      expect(res.status).toBe(401)
    })

    it('削除後、同じメールで再登録できる', async () => {
      // アカウント削除
      const deleteRes = await app.request('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          password: testUser.password,
        }),
      })
      expect(deleteRes.status).toBe(200)

      // 同じメールで再登録
      const registerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'new_password_123',
        }),
      })
      expect(registerRes.status).toBe(201)

      // 新しいパスワードでログインできる
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'new_password_123',
        }),
      })
      expect(loginRes.status).toBe(200)
    })
  })

  describe('POST /api/auth/request-password-reset', () => {
    beforeEach(async () => {
      // テストユーザーを登録
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })
    })

    it('有効なメールアドレスでリセット要求が成功する', async () => {
      const res = await app.request('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('If an account')

      // トークンがDBに保存されたことを確認
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, (await db.select().from(users).where(eq(users.email, testUser.email)))[0].id))

      expect(tokens.length).toBeGreaterThan(0)
    })

    it('存在しないメールアドレスでも成功を返す（タイミング攻撃対策）', async () => {
      const res = await app.request('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('If an account')
    })

    it('無効なメールアドレスでエラーを返す', async () => {
      const res = await app.request('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string

    beforeEach(async () => {
      // テストユーザーを登録
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      // リセットトークンを要求
      await app.request('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      })

      // リセットトークンをDBから取得（実際の使用ではメールから取得）
      const user = (await db.select().from(users).where(eq(users.email, testUser.email)))[0]
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id))

      // トークンをハッシュから元に戻すことはできないため、
      // テスト用にメモリにトークンを保存する必要がある
      // 実際の使用ではメールに含まれるトークンを使用する

      // このテストでは、直接トークンを生成する
      const { generateResetToken, hashToken, insertResetToken, calculateTokenExpiry } = await import('../../auth/passwordResetToken.js')
      resetToken = generateResetToken()
      await insertResetToken(user.id, hashToken(resetToken), calculateTokenExpiry())
    })

    it('有効なトークンでパスワードリセットが成功する', async () => {
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'NewSecurePassword456!',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('reset successfully')

      // 新しいパスワードでログインできることを確認
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'NewSecurePassword456!',
        }),
      })

      expect(loginRes.status).toBe(200)
    })

    it('無効なトークンでエラーを返す', async () => {
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'invalid-token',
          newPassword: 'NewSecurePassword456!',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeTruthy()
    })

    it('短すぎる新パスワードでエラーを返す', async () => {
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'short',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('使用済みトークンは再利用できない', async () => {
      // 1回目のリセット
      await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'NewSecurePassword456!',
        }),
      })

      // 2回目のリセット（同じトークン）
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'AnotherPassword789!',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeTruthy()
    })

    it('パスワードリセット後、既存のセッションが無効化される', async () => {
      // ログインしてセッションを作成
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      const cookies = loginRes.headers.get('Set-Cookie')
      const match = cookies?.match(/session_id=([^;]+)/)
      const sessionId = match?.[1] || ''

      // パスワードをリセット
      await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'NewSecurePassword456!',
        }),
      })

      // 既存のセッションで認証できないことを確認
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: `session_id=${sessionId}`,
        },
      })

      expect(meRes.status).toBe(401)
    })
  })
})
