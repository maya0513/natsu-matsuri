import React from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/lib/auth'
import { useForm } from '~/hooks/useForm'

const Login: React.FC = () => {
  const { values, loading, error, setLoading, setError, handleChange } = useForm({
    email: '',
    password: '',
  })

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(values.email, values.password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">ログイン</h1>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label htmlFor="email" className="block mb-1">メールアドレス:</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            className="border px-2 py-1"
            required
          />
        </div>

        <div className="mb-2">
          <label htmlFor="password" className="block mb-1">パスワード:</label>
          <input
            id="password"
            type="password"
            value={values.password}
            onChange={handleChange('password')}
            className="border px-2 py-1"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="px-2 py-1 border disabled:opacity-50">
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p className="mt-4">
        アカウントをお持ちでない方は{' '}
        <a href="/register" className="text-blue-600 underline">新規登録</a>
      </p>
    </div>
  )
}

export default Login
