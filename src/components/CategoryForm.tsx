import { useState } from 'react'
import { categoryService } from '../services/categoryService'
import type { Category } from '../types'
import './CategoryForm.css'

interface CategoryFormProps {
  categories: Category[]
  onSuccess: () => void
}

export const CategoryForm = ({ categories, onSuccess }: CategoryFormProps) => {
  const [categoryName, setCategoryName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryName.trim()) {
      alert('カテゴリー名を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const existingCategory = categories.find(
        (cat) => cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )

      if (existingCategory) {
        alert('同じ名前のカテゴリーが既に存在します')
        setSubmitting(false)
        return
      }

      await categoryService.createCategory({ name: categoryName.trim() })
      setCategoryName('')
      onSuccess()
      alert('カテゴリーを追加しました')
    } catch (error) {
      console.error('Failed to create category', error)
      alert('カテゴリーの作成に失敗しました')
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
        <button
          type="button"
          className="cancel-button"
          onClick={() => setCategoryName('')}
          disabled={submitting}
        >
          キャンセル
        </button>
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? '作成中...' : '作成'}
        </button>
      </div>
    </form>
  )
}

