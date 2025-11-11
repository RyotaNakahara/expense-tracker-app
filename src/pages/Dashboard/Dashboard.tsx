import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

// ログイン後に表示されるダッシュボード画面
const Dashboard = () => {
  // 認証済みユーザー情報とログアウト関数を取得
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()

  // ログアウトボタン押下時にサインアウトし、ログイン画面へ戻す
  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-user-email">{user?.email}</span>
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

