import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useUserName } from '../../hooks/useUserName'
import { ExpenseForm } from '../../components/ExpenseForm'
import { ExpensesTable } from '../../components/ExpensesTable'
import { ExpenseModal } from '../../components/ExpenseModal'
import type { Expense } from '../../types'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  // カスタムフックを使用してデータを取得
  const { expenses, loading: loadingExpenses, refreshExpenses } = useExpenses(user?.uid)

  // フォームの表示状態
  const [showForm, setShowForm] = useState<boolean>(false)

  // 今月の合計金額を計算
  const monthlyTotal = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return expenses
      .filter((expense) => {
        if (!expense.date) return false
        const expenseDate = expense.date.toDate()
        return (
          expenseDate.getFullYear() === currentYear &&
          expenseDate.getMonth() === currentMonth
        )
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }, [expenses])

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

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  const handleModalClose = () => {
    setSelectedExpense(null)
  }

  const handleExpenseUpdate = () => {
    refreshExpenses()
  }

  const handleExpenseDelete = () => {
    refreshExpenses()
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
        <section className="dashboard-card monthly-summary-section">
          <div className="monthly-summary-header">
            <h2>今月の支出</h2>
            <div className="monthly-summary-links">
              <Link to="/monthly-summary" className="monthly-summary-link">
                月毎のサマリー →
              </Link>
              <Link to="/monthly-expenses" className="monthly-search-link">
                支出を検索 →
              </Link>
            </div>
          </div>
          <div className="monthly-total">
            {loadingExpenses ? (
              <p className="loading-text">読み込み中...</p>
            ) : (
              <>
                <span className="monthly-total-amount">
                  ¥{monthlyTotal.toLocaleString()}
                </span>
                <p className="monthly-total-label">
                  {new Date().getMonth() + 1}月の合計金額
                </p>
              </>
            )}
          </div>
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
          <ExpensesTable
            expenses={expenses}
            loading={loadingExpenses}
            onExpenseClick={handleExpenseClick}
          />
        </section>
      </main>

      {selectedExpense && user?.uid && (
        <ExpenseModal
          expense={selectedExpense}
          userId={user.uid}
          onClose={handleModalClose}
          onUpdate={handleExpenseUpdate}
          onDelete={handleExpenseDelete}
        />
      )}
    </div>
  )
}

export default Dashboard
