import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDashboardExpenses, getCurrentYearMonth } from '../../hooks/useDashboardExpenses'
import { useUserName } from '../../hooks/useUserName'
import { ExpenseForm } from '../../components/ExpenseForm'
import { ExpensesTable } from '../../components/ExpensesTable'
import { ExpenseModal } from '../../components/ExpenseModal'
import { Pagination } from '../../components/Pagination'
import { buildDashboardYearOptions, isSameYearMonth } from '../../utils/dashboardYearMonth'
import type { Expense } from '../../types'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const {
    expenses,
    loading: loadingExpenses,
    monthlyTotal,
    monthlyLoading,
    currentPage: expenseListPage,
    totalPages: expenseListTotalPages,
    goToPage,
    refreshAfterMutation,
    error: dashboardListError,
    monthExpenseCount,
    selectedYearMonth,
    setSelectedYearMonth,
  } = useDashboardExpenses(user?.uid)

  const isViewingCurrentMonth = isSameYearMonth(selectedYearMonth, getCurrentYearMonth())

  const yearOptions = useMemo(
    () => buildDashboardYearOptions(selectedYearMonth.year),
    [selectedYearMonth.year]
  )

  const monthHeading = isViewingCurrentMonth
    ? '今月の支出'
    : `${selectedYearMonth.year}年${selectedYearMonth.month}月の支出`

  const expenseListHeading = isViewingCurrentMonth
    ? '今月の支出一覧'
    : `${selectedYearMonth.year}年${selectedYearMonth.month}月の支出一覧`

  const [showForm, setShowForm] = useState<boolean>(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

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
    await refreshAfterMutation()
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  const handleModalClose = () => {
    setSelectedExpense(null)
  }

  const handleExpenseUpdate = async () => {
    await refreshAfterMutation()
  }

  const handleExpenseDelete = async () => {
    await refreshAfterMutation()
  }

  const listBusy = loadingExpenses
  const summaryBusy = monthlyLoading

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-user-info">
          <Link to="/profile" className="dashboard-user-email">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </Link>
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
            <h2>{monthHeading}</h2>
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
            {summaryBusy ? (
              <p className="loading-text">読み込み中...</p>
            ) : (
              <>
                <span className="monthly-total-amount">
                  ¥{monthlyTotal.toLocaleString()}
                </span>
                <p className="monthly-total-label">
                  {isViewingCurrentMonth
                    ? `${selectedYearMonth.month}月の合計金額`
                    : `${selectedYearMonth.year}年${selectedYearMonth.month}月の合計金額`}
                </p>
              </>
            )}
          </div>
        </section>

        <section className="dashboard-card expense-form-section">
          <div className="expense-form-header">
            <h2>支出を登録</h2>
            <button
              type="button"
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
          <div className="expenses-section-header">
            <div className="expenses-section-heading-row">
              <h2>{expenseListHeading}</h2>
              <div className="expenses-section-controls">
                <div
                  className="dashboard-year-month-picker"
                  role="group"
                  aria-label="表示する年月"
                >
                  <label htmlFor="dashboard-year-select" className="dashboard-year-month-label">
                    年
                  </label>
                  <select
                    id="dashboard-year-select"
                    className="dashboard-year-month-select"
                    value={selectedYearMonth.year}
                    onChange={(e) =>
                      setSelectedYearMonth(Number(e.target.value), selectedYearMonth.month)
                    }
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="dashboard-month-select" className="dashboard-year-month-label">
                    月
                  </label>
                  <select
                    id="dashboard-month-select"
                    className="dashboard-year-month-select"
                    value={selectedYearMonth.month}
                    onChange={(e) =>
                      setSelectedYearMonth(selectedYearMonth.year, Number(e.target.value))
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="dashboard-expense-count" aria-live="polite">
                  {listBusy ? '読み込み中…' : `${monthExpenseCount}件`}
                </span>
              </div>
            </div>
          </div>
          {dashboardListError && (
            <p className="dashboard-list-error" role="alert">
              <span className="dashboard-list-error-summary">
                支出一覧の取得に失敗しました。Firestore に複合インデックス（collection: expenses、フィールド:
                userId と date、並び: date 降順）が有効か確認してください。読み取り回数の抑制のため、全件取得フォールバックは行いません。
              </span>
              {dashboardListError.message ? (
                <span className="dashboard-list-error-detail">{dashboardListError.message}</span>
              ) : null}
            </p>
          )}
          <ExpensesTable
            expenses={expenses}
            loading={listBusy}
            onExpenseClick={handleExpenseClick}
          />
          <Pagination
            currentPage={expenseListPage}
            totalPages={expenseListTotalPages}
            onPageChange={(p) => void goToPage(p)}
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
