import { z } from 'zod'
import { type Result, success, failure } from './result.js'

/**
 * Zodスキーマでバリデーションを行う純粋関数
 */
export const validate = <T>(
  schema: z.ZodSchema<T>,
  input: unknown
): Result<T, string> => {
  const result = schema.safeParse(input)

  if (!result.success) {
    return failure(result.error.errors.map((e) => e.message).join(', '))
  }

  return success(result.data)
}

/**
 * 複数のバリデーションを組み合わせる純粋関数
 */
export const validateAll = <T>(
  validations: Array<(input: T) => Result<T, string>>,
  input: T
): Result<T, string> => {
  for (const validation of validations) {
    const result = validation(input)
    if (!result.success) {
      return result
    }
  }
  return success(input)
}

/**
 * カスタムバリデーション関数を作成するヘルパー
 */
export const createValidator = <T>(
  predicate: (input: T) => boolean,
  errorMessage: string
): ((input: T) => Result<T, string>) => {
  return (input: T) => {
    if (predicate(input)) {
      return success(input)
    }
    return failure(errorMessage)
  }
}
