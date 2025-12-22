import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import { ExpensesTable } from '../../components/ExpensesTable'
import { PAYMENT_METHODS } from '../../constants/paymentMethods'
import './MonthlyExpenses.css'

const MonthlyExpenses = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { displayName, loading: loadingName } = useUserName(user)

  // カスタムフックを使用してデータを取得
  const { expenses, loading: loadingExpenses } = useExpenses(user?.uid)
  const { categories, loading: loadingCategories } = useCategories()
  const { allTags, loading: loadingTags } = useTags()

  // 現在の年月をデフォルト値として設定
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // getMonth()は0-11を返すため+1

  // URLクエリパラメータから年月を取得
  const urlYear = searchParams.get('year')
  const urlMonth = searchParams.get('month')

  // 検索条件の状態（URLパラメータがあればそれを使用、なければ現在の年月）
  const [selectedYear, setSelectedYear] = useState<number | null>(
    urlYear ? Number(urlYear) : currentYear
  )
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    urlMonth ? Number(urlMonth) : currentMonth
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])

  // 検索セクションの折りたたみ状態（URLパラメータがある場合は折りたたむ）
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(!urlYear && !urlMonth)

  // URLパラメータが変更されたときに状態を更新
  useEffect(() => {
    if (urlYear) {
      setSelectedYear(Number(urlYear))
    }
    if (urlMonth) {
      setSelectedMonth(Number(urlMonth))
    }
    // URLパラメータがある場合は検索セクションを折りたたむ
    if (urlYear || urlMonth) {
      setIsSearchExpanded(false)
    }
  }, [urlYear, urlMonth])

  // 選択した条件で支出をフィルタリング
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // 月のフィルタリング（選択されている場合）
      if (selectedYear !== null && selectedMonth !== null) {
        if (!expense.date) return false
        const expenseDate = expense.date.toDate()
        if (
          expenseDate.getFullYear() !== selectedYear ||
          expenseDate.getMonth() + 1 !== selectedMonth
        ) {
          return false
        }
      }

      // カテゴリーのフィルタリング（選択されている場合）
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(expense.bigCategory)) {
          return false
        }
      }

      // タグのフィルタリング（選択されている場合）
      if (selectedTags.length > 0) {
        const expenseTags = expense.tags.split(', ').filter((tag) => tag.trim() !== '')
        const hasSelectedTag = selectedTags.some((selectedTag) =>
          expenseTags.includes(selectedTag)
        )
        if (!hasSelectedTag) {
          return false
        }
      }

      // 支払い方法のフィルタリング（選択されている場合）
      if (selectedPaymentMethods.length > 0) {
        if (!selectedPaymentMethods.includes(expense.paymentMethod)) {
          return false
        }
      }

      return true
    })
  }, [
    expenses,
    selectedYear,
    selectedMonth,
    selectedCategories,
    selectedTags,
    selectedPaymentMethods,
  ])

  // フィルタリング結果の合計金額を計算
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }, [filteredExpenses])

  // 年と月の選択肢を生成
  const years = useMemo(() => {
    const yearSet = new Set<number>()
    expenses.forEach((expense) => {
      if (expense.date) {
        yearSet.add(expense.date.toDate().getFullYear())
      }
    })
    // 現在の年も含める
    yearSet.add(currentYear)
    return Array.from(yearSet).sort((a, b) => b - a) // 新しい順
  }, [expenses, currentYear])

  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ]

  // チェックボックスのハンドラー
  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    )
  }

  const handleTagToggle = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((name) => name !== tagName)
        : [...prev, tagName]
    )
  }

  const handlePaymentMethodToggle = (paymentMethod: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(paymentMethod)
        ? prev.filter((method) => method !== paymentMethod)
        : [...prev, paymentMethod]
    )
  }

  // すべての条件をクリア
  const handleClearFilters = () => {
    setSelectedYear(null)
    setSelectedMonth(null)
    setSelectedCategories([])
    setSelectedTags([])
    setSelectedPaymentMethods([])
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  return (
    <div className="monthly-expenses-page">
      <header className="monthly-expenses-header">
        <div className="monthly-expenses-header-left">
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
            aria-label="ダッシュボードに戻る"
          >
            ← ダッシュボード
          </button>
          <h1>支出検索</h1>
        </div>
        <div className="monthly-expenses-user-info">
          <span className="monthly-expenses-user-name">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <button className="monthly-expenses-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="monthly-expenses-content">
        {/* 検索セクション */}
        <section className="monthly-expenses-card search-section">
          <div className="search-section-header">
            <button
              className="search-section-toggle"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              type="button"
            >
              <h2>検索条件</h2>
              <span className="expand-icon">{isSearchExpanded ? '−' : '+'}</span>
            </button>
            <button className="clear-filters-button" onClick={handleClearFilters}>
              条件をクリア
            </button>
          </div>

          {!isSearchExpanded && (
            <div className="search-conditions-summary">
              <div className="conditions-list">
                {selectedYear && selectedMonth && (
                  <span className="condition-badge">
                    {selectedYear}年{selectedMonth}月
                  </span>
                )}
                {selectedCategories.length > 0 && (
                  <span className="condition-badge">
                    カテゴリー: {selectedCategories.join(', ')}
                  </span>
                )}
                {selectedTags.length > 0 && (
                  <span className="condition-badge">
                    タグ: {selectedTags.join(', ')}
                  </span>
                )}
                {selectedPaymentMethods.length > 0 && (
                  <span className="condition-badge">
                    支払い方法: {selectedPaymentMethods.join(', ')}
                  </span>
                )}
                {!selectedYear && !selectedMonth && selectedCategories.length === 0 && selectedTags.length === 0 && selectedPaymentMethods.length === 0 && (
                  <span className="condition-badge empty">条件なし</span>
                )}
              </div>
            </div>
          )}

          {isSearchExpanded && (
            <>
              {/* 期間選択 */}
              <div className="search-filter-group">
                <h3>期間</h3>
                <div className="date-selectors">
                  <div className="date-selector-group">
                    <label htmlFor="year-select">年</label>
                    <select
                      id="year-select"
                      value={selectedYear || ''}
                      onChange={(e) =>
                        setSelectedYear(e.target.value ? Number(e.target.value) : null)
                      }
                      className="date-select"
                    >
                      <option value="">すべて</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}年
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="date-selector-group">
                    <label htmlFor="month-select">月</label>
                    <select
                      id="month-select"
                      value={selectedMonth || ''}
                      onChange={(e) =>
                        setSelectedMonth(e.target.value ? Number(e.target.value) : null)
                      }
                      className="date-select"
                      disabled={selectedYear === null}
                    >
                      <option value="">すべて</option>
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* カテゴリー選択 */}
              <div className="search-filter-group">
                <h3>カテゴリー</h3>
                {loadingCategories ? (
                  <p>読み込み中...</p>
                ) : categories.length === 0 ? (
                  <p className="empty-message">カテゴリーが登録されていません</p>
                ) : (
                  <div className="checkbox-group">
                    {categories.map((category) => (
                      <label key={category.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.name)}
                          onChange={() => handleCategoryToggle(category.name)}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* タグ選択 */}
              <div className="search-filter-group">
                <h3>タグ</h3>
                {loadingTags ? (
                  <p>読み込み中...</p>
                ) : allTags.length === 0 ? (
                  <p className="empty-message">タグが登録されていません</p>
                ) : (
                  <div className="checkbox-group">
                    {allTags.map((tag) => (
                      <label key={tag.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.name)}
                          onChange={() => handleTagToggle(tag.name)}
                        />
                        <span>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 支払い方法選択 */}
              <div className="search-filter-group">
                <h3>支払い方法</h3>
                <div className="checkbox-group">
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedPaymentMethods.includes(method)}
                        onChange={() => handlePaymentMethodToggle(method)}
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* 合計金額セクション */}
        <section className="monthly-expenses-card summary-section">
          <h2>検索結果</h2>
          <div className="monthly-summary">
            {loadingExpenses ? (
              <p className="loading-text">読み込み中...</p>
            ) : (
              <>
                <span className="monthly-summary-amount">
                  ¥{totalAmount.toLocaleString()}
                </span>
                <p className="monthly-summary-label">
                  {filteredExpenses.length}件の支出
                </p>
              </>
            )}
          </div>
        </section>

        {/* 支出詳細セクション */}
        <section className="monthly-expenses-card expenses-section">
          <h2>支出詳細</h2>
          <ExpensesTable expenses={filteredExpenses} loading={loadingExpenses} />
        </section>
      </main>
    </div>
  )
}

export default MonthlyExpenses

