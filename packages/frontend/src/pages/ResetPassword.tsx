import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { api } from '../lib/api'

export const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('無効なリセットリンクです')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上である必要があります')
      return
    }

    setIsLoading(true)

    try {
      await api.resetPassword(token, newPassword)
      setIsSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'パスワードのリセットに失敗しました'
      )
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
              パスワードをリセットしました
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              新しいパスワードでログインできます。
              3秒後にログインページに移動します...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!token || error.includes('無効なリセット')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              エラー
            </h2>
            <p className="mt-2 text-center text-sm text-red-600">
              {error || '無効なリセットリンクです'}
            </p>
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
            新しいパスワードを設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            8文字以上のパスワードを入力してください
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && !error.includes('無効なリセット') && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="sr-only">
                新しいパスワード
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                パスワード確認
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="パスワード確認"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'リセット中...' : 'パスワードをリセット'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
