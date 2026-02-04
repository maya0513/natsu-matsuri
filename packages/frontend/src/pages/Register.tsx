import React from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/lib/auth'
import { useForm } from '~/hooks/useForm'
import { validatePasswordsForRegister } from '~/lib/passwordValidation'

const Register: React.FC = () => {
  const { values, loading, error, setLoading, setError, handleChange } = useForm({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePasswordsForRegister({
      password: values.password,
      confirmPassword: values.confirmPassword,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      await register(values.email, values.password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">新規登録</h1>

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
            minLength={8}
          />
        </div>

        <div className="mb-2">
          <label htmlFor="confirmPassword" className="block mb-1">パスワード（確認）:</label>
          <input
            id="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange('confirmPassword')}
            className="border px-2 py-1"
            required
            minLength={8}
          />
        </div>

        <button type="submit" disabled={loading} className="px-2 py-1 border disabled:opacity-50">
          {loading ? '登録中...' : '登録'}
        </button>
      </form>

      <p className="mt-4">
        既にアカウントをお持ちの方は{' '}
        <a href="/login" className="text-blue-600 underline">ログイン</a>
      </p>
    </div>
  )
}

export default Register
