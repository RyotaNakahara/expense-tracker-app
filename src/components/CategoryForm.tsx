import { useState, useEffect } from 'react'
import { categoryService } from '../services/categoryService'
import type { Category } from '../types'
import './CategoryForm.css'

type CategoryApi = {
  createCategory: (input: { name: string }) => Promise<string>
  updateCategory: (categoryId: string, input: { name: string }) => Promise<void>
}

interface CategoryFormProps {
  categories: Category[]
  onSuccess: () => void
  editingCategory?: Category | null
  onCancel?: () => void
  /** 省略時は支出カテゴリー */
  api?: CategoryApi
  namePlaceholder?: string
  inputId?: string
}

export const CategoryForm = ({
  categories,
  onSuccess,
  editingCategory,
  onCancel,
  api = categoryService,
  namePlaceholder = '例: 食費',
  inputId = 'categoryName',
}: CategoryFormProps) => {
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
        await api.updateCategory(editingCategory.id, { name: categoryName.trim() })
        alert('カテゴリーを更新しました')
      } else {
        await api.createCategory({ name: categoryName.trim() })
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
    <form className="management-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-group">
        <label htmlFor={inputId}>
          カテゴリー名 <span className="required">*</span>
        </label>
        <input
          type="text"
          id={inputId}
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder={namePlaceholder}
          required
          disabled={submitting}
        />
      </div>
      <div className="form-actions">
        {editingCategory && onCancel ? (
          <button type="button" className="cancel-button" onClick={onCancel} disabled={submitting}>
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
            ? editingCategory
              ? '更新中...'
              : '作成中...'
            : editingCategory
              ? '更新'
              : '作成'}
        </button>
      </div>
    </form>
  )
}
