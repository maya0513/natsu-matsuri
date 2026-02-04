import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'

export const RequestPasswordReset = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.requestPasswordReset(email)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リセットメールの送信に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              メールを送信しました
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              アカウントが存在する場合、パスワードリセット用のリンクがメールで送信されます。
              メールをご確認ください。
            </p>
          </div>
          <div>
            <Link
              to="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            パスワードリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '送信中...' : 'リセットリンクを送信'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ログインページに戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
