import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useUserName } from '../../hooks/useUserName'
import { ExpenseForm } from '../../components/ExpenseForm'
import { ExpensesTable } from '../../components/ExpensesTable'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  // カスタムフックを使用してデータを取得
  const { expenses, loading: loadingExpenses, refreshExpenses } = useExpenses(user?.uid)

  // フォームの表示状態
  const [showForm, setShowForm] = useState<boolean>(false)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  const handleExpenseSuccess = async () => {
    setShowForm(false)
    // 支出一覧を即座に更新
    await refreshExpenses()
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-user-email">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <Link to="/category-tag-management" className="management-link">
            カテゴリー・タグ管理
          </Link>
          <button className="dashboard-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-card welcome-section">
          <h2>ようこそ</h2>
          <p>ここに家計管理の概要やウィジェットを配置できます。</p>
        </section>

        <section className="dashboard-card expense-form-section">
          <div className="expense-form-header">
            <h2>支出を登録</h2>
            <button
              className="toggle-form-button"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'フォームを閉じる' : '支出を追加'}
            </button>
          </div>

          {showForm && user?.uid && (
            <ExpenseForm userId={user.uid} onSuccess={handleExpenseSuccess} />
          )}
        </section>

        <section className="dashboard-card expenses-section">
          <h2>支出一覧</h2>
          <ExpensesTable expenses={expenses} loading={loadingExpenses} />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
