import { useState } from 'react'

/**
 * フォーム状態を管理するカスタムフック
 */
export const useForm = <T extends Record<string, string>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({
      ...prev,
      [name]: e.target.value,
    }))
  }

  const reset = () => {
    setValues(initialValues)
    setError('')
    setLoading(false)
  }

  return {
    values,
    loading,
    error,
    setLoading,
    setError,
    handleChange,
    reset,
  }
}
