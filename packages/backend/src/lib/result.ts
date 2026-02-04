/**
 * Result型 - 関数型プログラミングのエラーハンドリング
 * 成功または失敗を表現する型
 */
export type Result<T, E = string> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E }

/**
 * 成功を表すResultを作成する純粋関数
 */
export const success = <T, E = string>(data: T): Result<T, E> => ({
  success: true,
  data,
})

/**
 * 失敗を表すResultを作成する純粋関数
 */
export const failure = <T, E = string>(error: E): Result<T, E> => ({
  success: false,
  error,
})

/**
 * Resultをマップする純粋関数
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (result.success) {
    return success(fn(result.data))
  }
  return result
}

/**
 * Resultをflatmapする純粋関数（モナディックチェーン）
 */
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> => {
  if (result.success) {
    return fn(result.data)
  }
  return result
}

/**
 * 非同期Resultをflatmapする純粋関数
 */
export const flatMapResultAsync = async <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> => {
  if (result.success) {
    return fn(result.data)
  }
  return result
}

/**
 * エラーメッセージをマップする純粋関数
 */
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (!result.success) {
    return failure(fn(result.error))
  }
  return result
}

/**
 * Resultから値を取得する（デフォルト値付き）
 */
export const getOrElse = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.success ? result.data : defaultValue
}

/**
 * 複数のResultをまとめる（全て成功した場合のみ成功）
 */
export const combineResults = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const data: T[] = []

  for (const result of results) {
    if (!result.success) {
      return result
    }
    data.push(result.data)
  }

  return success(data)
}
