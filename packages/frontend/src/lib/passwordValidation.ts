/**
 * パスワードバリデーション関数
 * 純粋関数として実装し、テスタビリティを向上
 */

export type PasswordValidationInput = {
  password: string
  confirmPassword: string
  currentPassword?: string
}

/**
 * パスワードの長さをチェックする純粋関数
 */
export const validatePasswordLength = (password: string): string | null => {
  if (password.length < 8) {
    return 'パスワードは8文字以上必要です'
  }
  return null
}

/**
 * パスワードの一致をチェックする純粋関数
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): string | null => {
  if (password !== confirmPassword) {
    return 'パスワードが一致しません'
  }
  return null
}

/**
 * 新しいパスワードが現在のパスワードと異なることをチェックする純粋関数
 */
export const validatePasswordDifferent = (
  newPassword: string,
  currentPassword: string
): string | null => {
  if (newPassword === currentPassword) {
    return '新しいパスワードは現在のパスワードと異なる必要があります'
  }
  return null
}

/**
 * パスワード登録時のバリデーション（Register用）
 */
export const validatePasswordsForRegister = (input: PasswordValidationInput): string | null => {
  const matchError = validatePasswordMatch(input.password, input.confirmPassword)
  if (matchError) return matchError

  const lengthError = validatePasswordLength(input.password)
  if (lengthError) return lengthError

  return null
}

/**
 * パスワード変更時のバリデーション（ChangePassword用）
 */
export const validatePasswordsForChange = (input: PasswordValidationInput): string | null => {
  const matchError = validatePasswordMatch(input.password, input.confirmPassword)
  if (matchError) return matchError

  const lengthError = validatePasswordLength(input.password)
  if (lengthError) return lengthError

  if (input.currentPassword) {
    const differentError = validatePasswordDifferent(input.password, input.currentPassword)
    if (differentError) return differentError
  }

  return null
}
