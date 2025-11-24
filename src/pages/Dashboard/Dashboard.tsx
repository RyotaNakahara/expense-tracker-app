import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import { ExpenseForm } from '../../components/ExpenseForm'
import { CategoryForm } from '../../components/CategoryForm'
import { TagForm } from '../../components/TagForm'
import { ExpensesTable } from '../../components/ExpensesTable'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  // カスタムフックを使用してデータを取得
  const { expenses, loading: loadingExpenses, refreshExpenses } = useExpenses(user?.uid)
  const { categories, refreshCategories } = useCategories()
  const { allTags, refreshTags } = useTags()

  // フォームの表示状態
  const [showForm, setShowForm] = useState<boolean>(false)
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false)
  const [showTagForm, setShowTagForm] = useState<boolean>(false)
  const [showCategoryTagSection, setShowCategoryTagSection] = useState<boolean>(false)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  const handleExpenseSuccess = () => {
    setShowForm(false)
    // refreshExpensesはuseExpensesフック内で自動的に実行されるため不要
  }

  const handleCategorySuccess = () => {
    setShowCategoryForm(false)
    refreshCategories()
  }

  const handleTagSuccess = () => {
    setShowTagForm(false)
    refreshTags()
  }

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
        <section className="dashboard-card welcome-section">
          <h2>ようこそ</h2>
          <p>ここに家計管理の概要やウィジェットを配置できます。</p>
        </section>

        <section className="dashboard-card category-tag-section">
          <div className="section-header">
            <h2>カテゴリー・タグ管理</h2>
            <button
              className="section-toggle-button"
              onClick={() => setShowCategoryTagSection(!showCategoryTagSection)}
              aria-label={showCategoryTagSection ? 'セクションを閉じる' : 'セクションを開く'}
            >
              <span className={showCategoryTagSection ? 'icon-open' : 'icon-closed'}>▼</span>
            </button>
          </div>

          {showCategoryTagSection && (
            <div className="management-forms">
              {/* カテゴリー作成フォーム */}
              <div className="management-form-item">
                <div className="management-form-header">
                  <h3>カテゴリーを作成</h3>
                  <button
                    className="toggle-form-button small"
                    onClick={() => {
                      setShowCategoryForm(!showCategoryForm)
                    }}
                  >
                    {showCategoryForm ? '閉じる' : 'カテゴリーを追加'}
                  </button>
                </div>

                {showCategoryForm && (
                  <CategoryForm categories={categories} onSuccess={handleCategorySuccess} />
                )}
              </div>

              {/* タグ作成フォーム */}
              <div className="management-form-item">
                <div className="management-form-header">
                  <h3>タグを作成</h3>
                  <button
                    className="toggle-form-button small"
                    onClick={() => {
                      setShowTagForm(!showTagForm)
                    }}
                  >
                    {showTagForm ? '閉じる' : 'タグを追加'}
                  </button>
                </div>

                {showTagForm && (
                  <TagForm
                    categories={categories}
                    allTags={allTags}
                    onSuccess={handleTagSuccess}
                  />
                )}
              </div>
            </div>
          )}
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
