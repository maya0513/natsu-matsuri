import React from 'react'
import { useAuth } from '~/lib/auth'
import { useNavigate } from 'react-router'

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Fooweb</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            ログアウト
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">ダッシュボード</h2>
          <p className="text-gray-700 mb-2">
            ようこそ、<span className="font-semibold">{user?.email}</span> さん
          </p>
          <p className="text-gray-600 text-sm">ユーザーID: {user?.id}</p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
