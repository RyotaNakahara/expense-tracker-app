import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import { CategoryForm } from '../../components/CategoryForm'
import { TagForm } from '../../components/TagForm'
import { CategoryModal } from '../../components/CategoryModal'
import { TagModal } from '../../components/TagModal'
import { SortableCategoryItem } from '../../components/SortableCategoryItem'
import { SortableTagItem } from '../../components/SortableTagItem'
import { categoryService } from '../../services/categoryService'
import { tagService } from '../../services/tagService'
import type { Category, Tag } from '../../types'
import './CategoryTagManagement.css'

const CategoryTagManagement = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const { categories, refreshCategories } = useCategories()
  const { allTags, refreshTags } = useTags()

  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false)
  const [showTagForm, setShowTagForm] = useState<boolean>(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
    setEditingCategory(null)
    refreshCategories()
  }

  const handleTagSuccess = () => {
    setShowTagForm(false)
    setEditingTag(null)
    refreshTags()
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }

  const handleCloseCategoryModal = () => {
    setEditingCategory(null)
  }

  const handleCategoryModalSuccess = () => {
    refreshCategories()
    refreshTags()
  }

  const handleCategoryModalDelete = () => {
    // タグの削除はモーダル内で処理されるため、ここではリフレッシュのみ
    refreshTags()
  }

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag)
  }

  const handleCloseTagModal = () => {
    setEditingTag(null)
  }

  const handleTagModalSuccess = () => {
    refreshTags()
  }

  const handleTagModalDelete = () => {
    // タグ削除はモーダル内で処理されるため、ここでは何もしない
  }

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id)
    const newIndex = categories.findIndex((cat) => cat.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newCategories = arrayMove(categories, oldIndex, newIndex)

    // 順序を更新
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      order: index,
    }))

    try {
      await categoryService.updateCategoriesOrder(updates)
      refreshCategories()
    } catch (error) {
      console.error('Failed to update category order', error)
      alert('順序の更新に失敗しました')
    }
  }

  const handleTagDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const categoryTags = allTags.filter((tag) => tag.categoryId === categoryId)
    const oldIndex = categoryTags.findIndex((tag) => tag.id === active.id)
    const newIndex = categoryTags.findIndex((tag) => tag.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newTags = arrayMove(categoryTags, oldIndex, newIndex)

    // 順序を更新
    const updates = newTags.map((tag, index) => ({
      id: tag.id,
      order: index,
    }))

    try {
      await tagService.updateTagsOrder(updates)
      refreshTags()
    } catch (error) {
      console.error('Failed to update tag order', error)
      alert('順序の更新に失敗しました')
    }
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
                if (editingCategory) {
                  setEditingCategory(null)
                }
                setShowCategoryForm(!showCategoryForm)
              }}
            >
              {showCategoryForm ? 'フォームを閉じる' : 'カテゴリーを追加'}
            </button>
          </div>

          {showCategoryForm && (
            <CategoryForm 
              categories={categories} 
              onSuccess={handleCategorySuccess}
            />
          )}

          <div className="items-list">
            <h3>登録済みカテゴリー</h3>
            {categories.length === 0 ? (
              <p className="empty-message">カテゴリーが登録されていません</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={categories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="items-list-items">
                    {categories.map((category) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        onEdit={handleEditCategory}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {editingCategory && (
            <CategoryModal
              category={editingCategory}
              categories={categories}
              allTags={allTags}
              onClose={handleCloseCategoryModal}
              onSuccess={handleCategoryModalSuccess}
              onDelete={handleCategoryModalDelete}
            />
          )}
        </section>

        {/* タグ作成セクション */}
        <section className="management-card tag-section">
          <div className="section-header">
            <h2>タグ管理</h2>
            <button
              className="toggle-form-button"
              onClick={() => {
                if (editingTag) {
                  setEditingTag(null)
                }
                setShowTagForm(!showTagForm)
              }}
            >
              {showTagForm ? 'フォームを閉じる' : 'タグを追加'}
            </button>
          </div>

          {showTagForm && (
            <TagForm 
              categories={categories} 
              allTags={allTags} 
              onSuccess={handleTagSuccess}
            />
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleTagDragEnd(event, category.id)}
                      >
                        <SortableContext
                          items={categoryTags.map((tag) => tag.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="items-list-items">
                            {categoryTags.map((tag) => (
                              <SortableTagItem
                                key={tag.id}
                                tag={tag}
                                onEdit={handleEditTag}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {editingTag && (
            <TagModal
              tag={editingTag}
              categories={categories}
              allTags={allTags}
              onClose={handleCloseTagModal}
              onSuccess={handleTagModalSuccess}
              onDelete={handleTagModalDelete}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default CategoryTagManagement

