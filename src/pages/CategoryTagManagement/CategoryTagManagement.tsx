import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import { CategoryForm } from '../../components/CategoryForm'
import { TagForm } from '../../components/TagForm'
import './CategoryTagManagement.css'

const CategoryTagManagement = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const { categories, refreshCategories } = useCategories()
  const { allTags, refreshTags } = useTags()

  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false)
  const [showTagForm, setShowTagForm] = useState<boolean>(false)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
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
    <div className="category-tag-management-page">
      <header className="management-header">
        <div className="management-header-left">
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
            aria-label="ダッシュボードに戻る"
          >
            ← ダッシュボード
          </button>
          <h1>カテゴリー・タグ管理</h1>
        </div>
        <div className="management-user-info">
          <span className="management-user-name">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <button className="management-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="management-content">
        {/* カテゴリー作成セクション */}
        <section className="management-card category-section">
          <div className="section-header">
            <h2>カテゴリー管理</h2>
            <button
              className="toggle-form-button"
              onClick={() => {
                setShowCategoryForm(!showCategoryForm)
              }}
            >
              {showCategoryForm ? 'フォームを閉じる' : 'カテゴリーを追加'}
            </button>
          </div>

          {showCategoryForm && (
            <CategoryForm categories={categories} onSuccess={handleCategorySuccess} />
          )}

          <div className="items-list">
            <h3>登録済みカテゴリー</h3>
            {categories.length === 0 ? (
              <p className="empty-message">カテゴリーが登録されていません</p>
            ) : (
              <ul className="items-list-items">
                {categories.map((category) => (
                  <li key={category.id} className="item-item">
                    {category.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* タグ作成セクション */}
        <section className="management-card tag-section">
          <div className="section-header">
            <h2>タグ管理</h2>
            <button
              className="toggle-form-button"
              onClick={() => {
                setShowTagForm(!showTagForm)
              }}
            >
              {showTagForm ? 'フォームを閉じる' : 'タグを追加'}
            </button>
          </div>

          {showTagForm && (
            <TagForm categories={categories} allTags={allTags} onSuccess={handleTagSuccess} />
          )}

          <div className="items-list">
            <h3>登録済みタグ</h3>
            {allTags.length === 0 ? (
              <p className="empty-message">タグが登録されていません</p>
            ) : (
              <div className="tags-grouped-by-category">
                {categories.map((category) => {
                  const categoryTags = allTags.filter((tag) => tag.categoryId === category.id)
                  if (categoryTags.length === 0) return null

                  return (
                    <div key={category.id} className="category-tags-group">
                      <h4 className="category-tags-title">{category.name}</h4>
                      <ul className="items-list-items">
                        {categoryTags.map((tag) => (
                          <li key={tag.id} className="item-item">
                            {tag.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default CategoryTagManagement

