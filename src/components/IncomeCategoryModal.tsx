import { useState, useEffect } from 'react'
import { incomeCategoryService } from '../services/incomeCategoryService'
import type { Category } from '../types'
import './CategoryModal.css'

interface IncomeCategoryModalProps {
  category: Category | null
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

export const IncomeCategoryModal = ({
  category,
  categories,
  onClose,
  onSuccess,
}: IncomeCategoryModalProps) => {
  const [categoryName, setCategoryName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCategoryName(category?.name ?? '')
  }, [category])

  if (!category) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      alert('カテゴリー名を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const existing = categories.find(
        (cat) =>
          cat.id !== category.id && cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )
      if (existing) {
        alert('同じ名前のカテゴリーが既に存在します')
        setSubmitting(false)
        return
      }

      await incomeCategoryService.updateCategory(category.id, { name: categoryName.trim() })
      alert('カテゴリーを更新しました')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to update income category', error)
      alert('カテゴリーの更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `「${category.name}」を削除しますか？\n既に登録済みの収入のカテゴリー名はそのまま残ります。`
      )
    ) {
      return
    }

    setSubmitting(true)
    try {
      await incomeCategoryService.deleteCategory(category.id)
      alert('カテゴリーを削除しました')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to delete income category', error)
      alert('カテゴリーの削除に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="category-modal-overlay" onClick={onClose}>
      <div className="category-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="category-modal-header">
          <h2>収入カテゴリーの編集</h2>
          <button type="button" className="category-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="category-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-group">
            <label htmlFor="income-category-edit-name">
              カテゴリー名 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="income-category-edit-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="category-modal-actions">
            <button
              type="button"
              className="delete-button"
              disabled={submitting}
              onClick={() => void handleDelete()}
            >
              削除
            </button>
            <div className="action-buttons-right">
              <button type="button" className="cancel-button" onClick={onClose} disabled={submitting}>
                キャンセル
              </button>
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
