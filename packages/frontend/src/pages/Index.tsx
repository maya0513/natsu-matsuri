import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/lib/auth'

const Index: React.FC = () => {
  const { user, logout, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAccount(deletePassword)
      setShowDeleteDialog(false)
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'アカウント削除に失敗しました')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Fooweb</h1>

      {!user && (
        <div>
          <p className="mb-2">ユーザー認証機能を持つサンプルアプリケーション</p>
          <ul>
            <li><a href="/login" className="text-blue-600 underline">ログイン</a></li>
            <li><a href="/register" className="text-blue-600 underline">新規登録</a></li>
          </ul>
        </div>
      )}

      {user && (
        <div>
          <p className="mb-2">ログイン中: {user.email}</p>
          <p className="mb-4 text-sm text-gray-600">ID: {user.id}</p>

          <ul className="mb-4">
            <li><a href="/change-password" className="text-blue-600 underline">パスワード変更</a></li>
            <li>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-blue-600 underline"
              >
                アカウント削除
              </button>
            </li>
            <li>
              <button onClick={handleLogout} className="text-blue-600 underline">
                ログアウト
              </button>
            </li>
          </ul>

          {showDeleteDialog && (
            <div className="border p-4 mb-4">
              <h2 className="text-xl mb-2">アカウント削除</h2>
              <p className="mb-2">本当にアカウントを削除しますか？この操作は取り消せません。</p>

              {deleteError && (
                <p className="text-red-600 mb-2">{deleteError}</p>
              )}

              <div className="mb-2">
                <label htmlFor="deletePassword" className="block mb-1">
                  パスワードを入力して確認:
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="border px-2 py-1"
                  required
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setDeletePassword('')
                    setDeleteError('')
                  }}
                  disabled={deleteLoading}
                  className="mr-2 px-2 py-1 border"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || !deletePassword}
                  className="px-2 py-1 border disabled:opacity-50"
                >
                  {deleteLoading ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Index
