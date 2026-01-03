import { useState, useEffect } from 'react'
import { tagService } from '../services/tagService'
import type { Category, Tag } from '../types'
import './TagModal.css'

interface TagModalProps {
  tag: Tag | null
  categories: Category[]
  allTags: Tag[]
  onClose: () => void
  onSuccess: () => void
  onDelete: () => void
}

export const TagModal = ({
  tag,
  categories,
  allTags,
  onClose,
  onSuccess,
  onDelete,
}: TagModalProps) => {
  const [tagName, setTagName] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (tag) {
      setTagName(tag.name)
      setSelectedCategoryId(tag.categoryId)
    } else {
      setTagName('')
      setSelectedCategoryId('')
    }
  }, [tag])

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
        (t) =>
          t.id !== tag?.id &&
          t.categoryId === selectedCategory.id &&
          t.name.toLowerCase() === tagName.trim().toLowerCase()
      )

      if (existingTag) {
        alert('このカテゴリーに同じ名前のタグが既に存在します')
        setSubmitting(false)
        return
      }

      if (tag) {
        // 編集モード
        await tagService.updateTag(tag.id, {
          name: tagName.trim(),
          categoryId: selectedCategory.id,
        })
        alert('タグを更新しました')
      } else {
        // 作成モード
        await tagService.createTag({
          name: tagName.trim(),
          categoryId: selectedCategory.id,
        })
        alert('タグを追加しました')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save tag', error)
      alert(tag ? 'タグの更新に失敗しました' : 'タグの作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tag) return

    if (!window.confirm(`「${tag.name}」を削除しますか？`)) {
      return
    }

    setSubmitting(true)
    try {
      await tagService.deleteTag(tag.id)
      alert('タグを削除しました')
      onDelete()
      onClose()
    } catch (error) {
      console.error('Failed to delete tag', error)
      alert('タグの削除に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!tag) return null

  return (
    <div className="tag-modal-overlay" onClick={onClose}>
      <div className="tag-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tag-modal-header">
          <h2>タグの編集</h2>
          <button className="tag-modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <form className="tag-modal-form" onSubmit={handleSubmit}>
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
                disabled={submitting || !!tag}
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

          <div className="tag-modal-actions">
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
              <button
                type="submit"
                className="submit-button"
                disabled={submitting || !selectedCategoryId}
              >
                {submitting ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

