import { useState, useEffect } from 'react'
import { categoryService } from '../services/categoryService'
import { tagService } from '../services/tagService'
import type { Category, Tag } from '../types'
import './CategoryModal.css'

interface CategoryModalProps {
  category: Category | null
  categories: Category[]
  allTags: Tag[]
  onClose: () => void
  onSuccess: () => void
  onDelete: () => void
}

export const CategoryModal = ({
  category,
  categories,
  allTags,
  onClose,
  onSuccess,
  onDelete,
}: CategoryModalProps) => {
  const [categoryName, setCategoryName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (category) {
      setCategoryName(category.name)
    } else {
      setCategoryName('')
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryName.trim()) {
      alert('カテゴリー名を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const existingCategory = categories.find(
        (cat) =>
          cat.id !== category?.id &&
          cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )

      if (existingCategory) {
        alert('同じ名前のカテゴリーが既に存在します')
        setSubmitting(false)
        return
      }

      if (category) {
        // 編集モード
        await categoryService.updateCategory(category.id, { name: categoryName.trim() })
        alert('カテゴリーを更新しました')
      } else {
        // 作成モード
        await categoryService.createCategory({ name: categoryName.trim() })
        alert('カテゴリーを追加しました')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save category', error)
      alert(category ? 'カテゴリーの更新に失敗しました' : 'カテゴリーの作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return

    if (!window.confirm(`「${category.name}」を削除しますか？\nこのカテゴリーに関連するタグも削除されます。`)) {
      return
    }

    setSubmitting(true)
    try {
      // 関連するタグを削除
      const relatedTags = allTags.filter((tag) => tag.categoryId === category.id)
      for (const tag of relatedTags) {
        await tagService.deleteTag(tag.id)
      }
      
      // カテゴリーを削除
      await categoryService.deleteCategory(category.id)
      
      // コールバックを呼び出して親コンポーネントに通知
      onDelete()
      alert('カテゴリーを削除しました')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to delete category', error)
      alert('カテゴリーの削除に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!category) return null

  return (
    <div className="category-modal-overlay" onClick={onClose}>
      <div className="category-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="category-modal-header">
          <h2>カテゴリーの編集</h2>
          <button className="category-modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <form className="category-modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="categoryName">カテゴリー名 <span className="required">*</span></label>
            <input
              type="text"
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="例: 食費"
              required
              disabled={submitting}
            />
          </div>

          <div className="category-modal-actions">
            <button
              type="button"
              className="delete-button"
              onClick={handleDelete}
              disabled={submitting}
            >
              削除
            </button>
            <div className="action-buttons-right">
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={submitting}
              >
                キャンセル
              </button>
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

