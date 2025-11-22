import { useState } from 'react'
import { tagService } from '../services/tagService'
import type { Category, Tag } from '../types'
import './TagForm.css'

interface TagFormProps {
  categories: Category[]
  allTags: Tag[]
  onSuccess: () => void
}

export const TagForm = ({ categories, allTags, onSuccess }: TagFormProps) => {
  const [tagName, setTagName] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tagName.trim()) {
      alert('タグ名を入力してください')
      return
    }

    if (!selectedCategoryId) {
      alert('カテゴリーを選択してください')
      return
    }

    setSubmitting(true)
    try {
      const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId)
      if (!selectedCategory) {
        alert('カテゴリーが見つかりません')
        setSubmitting(false)
        return
      }

      const existingTag = allTags.find(
        (tag) =>
          tag.categoryId === selectedCategory.id &&
          tag.name.toLowerCase() === tagName.trim().toLowerCase()
      )

      if (existingTag) {
        alert('このカテゴリーに同じ名前のタグが既に存在します')
        setSubmitting(false)
        return
      }

      await tagService.createTag({
        name: tagName.trim(),
        categoryId: selectedCategory.id,
      })

      setTagName('')
      setSelectedCategoryId('')
      onSuccess()
      alert('タグを追加しました')
    } catch (error) {
      console.error('Failed to create tag', error)
      alert('タグの作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="management-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="tagCategory">カテゴリー <span className="required">*</span></label>
        {categories.length === 0 ? (
          <p className="tag-hint">まずカテゴリーを作成してください</p>
        ) : (
          <select
            id="tagCategory"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">選択してください</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="tagName">タグ名 <span className="required">*</span></label>
        <input
          type="text"
          id="tagName"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          placeholder="例: 必需品"
          required
          disabled={submitting || !selectedCategoryId}
        />
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            setTagName('')
            setSelectedCategoryId('')
          }}
          disabled={submitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="submit-button"
          disabled={submitting || !selectedCategoryId}
        >
          {submitting ? '作成中...' : '作成'}
        </button>
      </div>
    </form>
  )
}

