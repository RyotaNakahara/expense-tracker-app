import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDashboardExpenses, getCurrentYearMonth } from '../../hooks/useDashboardExpenses'
import { useDashboardIncomes } from '../../hooks/useDashboardIncomes'
import { useUserName } from '../../hooks/useUserName'
import { ExpenseForm } from '../../components/ExpenseForm'
import { ExpensesTable } from '../../components/ExpensesTable'
import { ExpenseModal } from '../../components/ExpenseModal'
import { IncomeForm } from '../../components/IncomeForm'
import { IncomesTable } from '../../components/IncomesTable'
import { IncomeModal } from '../../components/IncomeModal'
import { Pagination } from '../../components/Pagination'
import { BudgetProgressBar } from '../../components/BudgetProgressBar'
import { BudgetScopedProgress } from '../../components/BudgetScopedProgress'
import { useTotalMonthBudget } from '../../hooks/useTotalMonthBudget'
import { useMonthBudgetCarryover } from '../../hooks/useMonthBudgetCarryover'
import { useMonthScopedBudgets } from '../../hooks/useMonthScopedBudgets'
import { buildDashboardYearOptions, isSameYearMonth } from '../../utils/dashboardYearMonth'
import type { Expense, Income } from '../../types'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const {
    expenses,
    monthExpensesAll,
    monthExpensesAllLoading,
    ensureMonthExpensesAll,
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

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  /** 収入まわりは普段閉じる */
  const [showIncomeSection, setShowIncomeSection] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)

  const {
    incomes,
    loading: loadingIncomes,
    monthlyTotal: monthlyIncomeTotal,
    monthlyLoading: incomeSummaryLoading,
    currentPage: incomeListPage,
    totalPages: incomeListTotalPages,
    goToPage: goToIncomePage,
    refreshAfterMutation: refreshIncomesAfterMutation,
    error: incomeListError,
    monthIncomeCount,
  } = useDashboardIncomes(user?.uid, selectedYearMonth, showIncomeSection)

  const { totalBudget, loading: budgetLoading } = useTotalMonthBudget(
    user?.uid,
    selectedYearMonth.year,
    selectedYearMonth.month
  )
  const { carryover, loading: carryoverLoading, refresh: refreshCarryover } = useMonthBudgetCarryover(
    user?.uid,
    selectedYearMonth.year,
    selectedYearMonth.month
  )
  const {
    categoryBudgets,
    tagBudgets,
    loading: scopedBudgetLoading,
  } = useMonthScopedBudgets(user?.uid, selectedYearMonth.year, selectedYearMonth.month)

  const needsScopedExpenses = categoryBudgets.length > 0 || tagBudgets.length > 0

  useEffect(() => {
    if (needsScopedExpenses) {
      void ensureMonthExpensesAll()
    }
  }, [needsScopedExpenses, ensureMonthExpensesAll, selectedYearMonth])

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

  const incomeListHeading = isViewingCurrentMonth
    ? '今月の収入一覧'
    : `${selectedYearMonth.year}年${selectedYearMonth.month}月の収入一覧`

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  const handleExpenseSuccess = async () => {
    setShowExpenseForm(false)
    await refreshAfterMutation()
    refreshCarryover()
  }

  const handleIncomeSuccess = async () => {
    setShowIncomeForm(false)
    await refreshIncomesAfterMutation()
    refreshCarryover()
  }

  const listBusy = loadingExpenses
  const incomeListBusy = loadingIncomes
  const summaryBusy = monthlyLoading || incomeSummaryLoading

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
          <button className="dashboard-signout-button" onClick={() => void handleSignOut()}>
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
              <Link
                to={`/budget?year=${selectedYearMonth.year}&month=${selectedYearMonth.month}`}
                className="monthly-budget-link"
              >
                予算設定 →
              </Link>
            </div>
          </div>
          <div className="monthly-total">
            {summaryBusy ? (
              <p className="loading-text">読み込み中...</p>
            ) : (
              <>
                <div className="monthly-totals-grid">
                  <div className="monthly-total-block">
                    <span className="monthly-total-amount">
                      ¥{monthlyTotal.toLocaleString()}
                    </span>
                    <p className="monthly-total-label">支出合計</p>
                  </div>
                  <div className="monthly-total-block">
                    <span className="monthly-total-amount monthly-total-amount--income">
                      ¥{monthlyIncomeTotal.toLocaleString()}
                    </span>
                    <p className="monthly-total-label">収入合計</p>
                  </div>
                </div>
                <BudgetProgressBar
                  used={monthlyTotal}
                  limit={totalBudget?.amountLimit ?? null}
                  carryIn={carryover?.carryIn ?? 0}
                  income={monthlyIncomeTotal}
                  loading={budgetLoading || carryoverLoading}
                  budgetSettingsTo={`/budget?year=${selectedYearMonth.year}&month=${selectedYearMonth.month}`}
                />
                <BudgetScopedProgress
                  expenses={monthExpensesAll}
                  categoryBudgets={categoryBudgets}
                  tagBudgets={tagBudgets}
                  loading={
                    scopedBudgetLoading ||
                    summaryBusy ||
                    (needsScopedExpenses && monthExpensesAllLoading)
                  }
                  budgetSettingsTo={`/budget?year=${selectedYearMonth.year}&month=${selectedYearMonth.month}`}
                />
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
              onClick={() => setShowExpenseForm(!showExpenseForm)}
            >
              {showExpenseForm ? 'フォームを閉じる' : '支出を追加'}
            </button>
          </div>
          {showExpenseForm && user?.uid && (
            <ExpenseForm userId={user.uid} onSuccess={() => void handleExpenseSuccess()} />
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
            onExpenseClick={setSelectedExpense}
          />
          <Pagination
            currentPage={expenseListPage}
            totalPages={expenseListTotalPages}
            onPageChange={(p) => void goToPage(p)}
          />
        </section>

        <section className="dashboard-card income-toggle-section">
          <button
            type="button"
            className="income-section-toggle"
            aria-expanded={showIncomeSection}
            onClick={() => setShowIncomeSection((v) => !v)}
          >
            <span>{showIncomeSection ? '収入を閉じる' : '収入を表示'}</span>
            <span className="income-section-toggle-icon" aria-hidden="true">
              {showIncomeSection ? '▲' : '▼'}
            </span>
          </button>
        </section>

        {showIncomeSection && (
          <>
            <section className="dashboard-card expense-form-section">
              <div className="expense-form-header">
                <h2>収入を登録</h2>
                <button
                  type="button"
                  className="toggle-form-button"
                  onClick={() => setShowIncomeForm(!showIncomeForm)}
                >
                  {showIncomeForm ? 'フォームを閉じる' : '収入を追加'}
                </button>
              </div>
              {showIncomeForm && user?.uid && (
                <IncomeForm userId={user.uid} onSuccess={() => void handleIncomeSuccess()} />
              )}
            </section>

            <section className="dashboard-card expenses-section">
              <div className="expenses-section-header">
                <div className="expenses-section-heading-row">
                  <h2>{incomeListHeading}</h2>
                  <div className="expenses-section-controls">
                    <span className="dashboard-expense-count" aria-live="polite">
                      {incomeListBusy ? '読み込み中…' : `${monthIncomeCount}件`}
                    </span>
                  </div>
                </div>
              </div>
              {incomeListError && (
                <p className="dashboard-list-error" role="alert">
                  収入一覧の取得に失敗しました。Firestore の複合インデックス（incomes: userId + date
                  降順）が有効か確認してください。
                  {incomeListError.message ? (
                    <span className="dashboard-list-error-detail">{incomeListError.message}</span>
                  ) : null}
                </p>
              )}
              <IncomesTable
                incomes={incomes}
                loading={incomeListBusy}
                onIncomeClick={setSelectedIncome}
              />
              <Pagination
                currentPage={incomeListPage}
                totalPages={incomeListTotalPages}
                onPageChange={(p) => void goToIncomePage(p)}
              />
            </section>
          </>
        )}
      </main>

      {selectedExpense && user?.uid && (
        <ExpenseModal
          expense={selectedExpense}
          userId={user.uid}
          onClose={() => setSelectedExpense(null)}
          onUpdate={() => {
            void refreshAfterMutation()
            refreshCarryover()
          }}
          onDelete={() => {
            void refreshAfterMutation()
            refreshCarryover()
          }}
        />
      )}

      {selectedIncome && user?.uid && (
        <IncomeModal
          income={selectedIncome}
          userId={user.uid}
          onClose={() => setSelectedIncome(null)}
          onUpdate={() => {
            void refreshIncomesAfterMutation()
            refreshCarryover()
          }}
          onDelete={() => {
            void refreshIncomesAfterMutation()
            refreshCarryover()
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
