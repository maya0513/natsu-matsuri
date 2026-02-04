import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'secure_password_123'

  test('ユーザー登録 → ログイン → ログアウトのフロー', async ({ page }) => {
    // 新規登録ページに移動
    await page.goto('/register')
    await expect(page).toHaveTitle(/Fooweb/)

    // 新規登録
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.fill('#confirmPassword', testPassword)
    await page.click('button[type="submit"]')

    // ホームページにリダイレクトされる
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=ようこそ')).toBeVisible()
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // ログアウト
    await page.click('text=ログアウト')

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/login')

    // 再度ログイン
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')

    // ホームページに戻る
    await expect(page).toHaveURL('/')
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('間違ったパスワードでエラーが表示される', async ({ page }) => {
    // 最初のユーザーが既に登録されている前提
    await page.goto('/login')

    await page.fill('#email', testEmail)
    await page.fill('#password', 'wrong_password')
    await page.click('button[type="submit"]')

    // エラーメッセージが表示される
    await expect(page.locator('text=Invalid')).toBeVisible()

    // ログインページのまま
    await expect(page).toHaveURL('/login')
  })

  test('認証なしでホームにアクセスするとログインページにリダイレクト', async ({ page }) => {
    // 新しいコンテキストで（ログインなしで）ホームにアクセス
    await page.goto('/')

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/login')
  })

  test('ログイン済みでログインページにアクセスするとホームにリダイレクト', async ({ page }) => {
    // ログイン
    await page.goto('/login')
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')

    // ホームに到達
    await expect(page).toHaveURL('/')

    // 再度ログインページにアクセス
    await page.goto('/login')

    // ホームにリダイレクトされる
    await expect(page).toHaveURL('/')
  })
})
