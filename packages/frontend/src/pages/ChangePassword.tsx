import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/lib/auth'
import { useForm } from '~/hooks/useForm'
import { validatePasswordsForChange } from '~/lib/passwordValidation'

const ChangePassword: React.FC = () => {
  const { values, loading, error, setLoading, setError, handleChange } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const { changePassword } = useAuth()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePasswordsForChange({
      password: values.newPassword,
      confirmPassword: values.confirmPassword,
      currentPassword: values.currentPassword,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await changePassword(values.currentPassword, values.newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワード変更に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">パスワード変更</h1>

      {success && (
        <p className="text-green-600 mb-2">
          パスワードを変更しました。ログインページに移動します...
        </p>
      )}

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label htmlFor="currentPassword" className="block mb-1">現在のパスワード:</label>
          <input
            id="currentPassword"
            type="password"
            value={values.currentPassword}
            onChange={handleChange('currentPassword')}
            className="border px-2 py-1"
            required
          />
        </div>

        <div className="mb-2">
          <label htmlFor="newPassword" className="block mb-1">新しいパスワード:</label>
          <input
            id="newPassword"
            type="password"
            value={values.newPassword}
            onChange={handleChange('newPassword')}
            className="border px-2 py-1"
            required
            minLength={8}
          />
        </div>

        <div className="mb-2">
          <label htmlFor="confirmPassword" className="block mb-1">新しいパスワード（確認）:</label>
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

        <button
          type="submit"
          disabled={loading || success}
          className="px-2 py-1 border disabled:opacity-50"
        >
          {loading ? '変更中...' : 'パスワードを変更'}
        </button>
      </form>

      <p className="mt-4">
        <a href="/" className="text-blue-600 underline">ホームに戻る</a>
      </p>
    </div>
  )
}

export default ChangePassword
