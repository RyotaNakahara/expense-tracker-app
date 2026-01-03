import { useState, useEffect } from 'react'
import { categoryService } from '../services/categoryService'
import type { Category } from '../types'
import './CategoryForm.css'

interface CategoryFormProps {
  categories: Category[]
  onSuccess: () => void
  editingCategory?: Category | null
  onCancel?: () => void
}

export const CategoryForm = ({ categories, onSuccess, editingCategory, onCancel }: CategoryFormProps) => {
  const [categoryName, setCategoryName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (editingCategory) {
      setCategoryName(editingCategory.name)
    } else {
      setCategoryName('')
    }
  }, [editingCategory])

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
          cat.id !== editingCategory?.id &&
          cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )

      if (existingCategory) {
        alert('同じ名前のカテゴリーが既に存在します')
        setSubmitting(false)
        return
      }

      if (editingCategory) {
        // 編集モード
        await categoryService.updateCategory(editingCategory.id, { name: categoryName.trim() })
        alert('カテゴリーを更新しました')
      } else {
        // 作成モード
        await categoryService.createCategory({ name: categoryName.trim() })
        setCategoryName('')
        alert('カテゴリーを追加しました')
      }
      
      onSuccess()
    } catch (error) {
      console.error('Failed to save category', error)
      alert(editingCategory ? 'カテゴリーの更新に失敗しました' : 'カテゴリーの作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="management-form" onSubmit={handleSubmit}>
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
      <div className="form-actions">
        {editingCategory && onCancel ? (
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={submitting}
          >
            キャンセル
          </button>
        ) : (
          <button
            type="button"
            className="cancel-button"
            onClick={() => setCategoryName('')}
            disabled={submitting}
          >
            キャンセル
          </button>
        )}
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting 
            ? (editingCategory ? '更新中...' : '作成中...') 
            : (editingCategory ? '更新' : '作成')}
        </button>
      </div>
    </form>
  )
}

