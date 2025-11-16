import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import './Dashboard.css'

// ログイン後に表示されるダッシュボード画面
const Dashboard = () => {
  // 認証済みユーザー情報とログアウト関数を取得
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loadingName, setLoadingName] = useState<boolean>(true)

  // ログアウトボタン押下時にサインアウトし、ログイン画面へ戻す
  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  // Firestore の users コレクションからユーザー名を取得
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.uid) {
        setDisplayName(null)
        setLoadingName(false)
        return
      }
      try {
        // Firestore の users/{uid} ドキュメントからプロフィールを取得
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)
        if (!snap.exists()) {
          // ユーザードキュメントが存在しない場合は警告を出し、Auth の displayName にフォールバック
          console.warn('[Dashboard] users document not found for uid:', user.uid)
          setDisplayName(user.displayName ?? null)
        } else {
          // ドキュメントの name フィールドを読み取り、空文字は未設定として扱う
          const data = snap.data() as { name?: string } | undefined
          const name = (data?.name ?? '').trim()
          // name が未設定なら Auth の displayName にフォールバック
          setDisplayName(name !== '' ? name : user.displayName ?? null)
        }
      } catch (e) {
        // Firestore 読み取り失敗（権限不足など）の場合はエラーログを出し、表示名は未設定にする
        console.error('Failed to load user profile', e)
        setDisplayName(null)
      } finally {
        // ローディング状態の解除
        setLoadingName(false)
      }
    }
    fetchUserName()
  }, [user?.uid])

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-user-email">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <button className="dashboard-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-card">
          <h2>ようこそ</h2>
          <p>ここに家計管理の概要やウィジェットを配置できます。</p>
        </section>
      </main>
    </div>
  )
}

export default Dashboard

