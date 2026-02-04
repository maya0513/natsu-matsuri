/**
 * メール送信サービスのインターフェース
 */
export interface EmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>
}

/**
 * テスト用モックメールサービス
 */
export class MockEmailService implements EmailService {
  public sentEmails: Array<{ email: string; token: string }> = []

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({ email, token })
  }
}

/**
 * 開発環境用メールサービス（コンソール出力）
 */
export class ConsoleEmailService implements EmailService {
  private baseUrl: string

  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`
    console.log('\n=== パスワードリセットメール ===')
    console.log(`宛先: ${email}`)
    console.log(`リセットURL: ${resetUrl}`)
    console.log('=============================\n')
  }
}
