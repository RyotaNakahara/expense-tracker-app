import { useState, useEffect } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useExpenses } from '../hooks/useExpenses'
import { PAYMENT_METHODS } from '../constants/paymentMethods'
import type { Expense, Category, UpdateExpenseInput } from '../types'
import './ExpenseModal.css'

interface ExpenseModalProps {
  expense: Expense | null
  userId: string
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

export const ExpenseModal = ({
  expense,
  userId,
  onClose,
  onUpdate,
  onDelete,
}: ExpenseModalProps) => {
  const [formData, setFormData] = useState<UpdateExpenseInput>({})
  const [submitting, setSubmitting] = useState<boolean>(false)
  const { categories, loading: loadingCategories } = useCategories()
  const { updateExpense, deleteExpense } = useExpenses(userId)

  // 選択されたカテゴリーIDを取得
  const selectedCategoryId = categories.find(
    (cat: Category) => cat.name === (formData.bigCategory || expense?.bigCategory)
  )?.id

  const { filteredTags, loading: loadingTags } = useTags(selectedCategoryId)

  // 支出データをフォームに設定
  useEffect(() => {
    if (expense) {
      const expenseDate = expense.date.toDate()
      const tagsArray = expense.tags ? expense.tags.split(', ').filter(Boolean) : []
      
      setFormData({
        date: expenseDate,
        amount: expense.amount,
        bigCategory: expense.bigCategory,
        tags: tagsArray,
        paymentMethod: expense.paymentMethod,
        description: expense.description || '',
      })
    }
  }, [expense])

  const handleTagToggle = (tagName: string) => {
    setFormData((prev) => {
      const currentTags = prev.tags || []
      const newTags = currentTags.includes(tagName)
        ? currentTags.filter((t) => t !== tagName)
        : [...currentTags, tagName]
      return { ...prev, tags: newTags }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!expense) return

    if (
      !formData.date ||
      formData.amount === undefined ||
      !formData.bigCategory ||
      !formData.paymentMethod
    ) {
      alert('必須項目を入力してください')
      return
    }

    const amount = typeof formData.amount === 'number' ? formData.amount : parseFloat(String(formData.amount))
    if (isNaN(amount) || amount <= 0) {
      alert('有効な金額を入力してください')
      return
    }

    setSubmitting(true)
    try {
      await updateExpense(expense.id, {
        date: formData.date instanceof Date ? formData.date : new Date(formData.date),
        amount: amount,
        bigCategory: formData.bigCategory,
        tags: formData.tags,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
      })

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Failed to update expense', error)
      alert('支出の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return

    if (!confirm('この支出を削除してもよろしいですか？')) {
      return
    }

    setSubmitting(true)
    try {
      await deleteExpense(expense.id)
      onDelete()
      onClose()
    } catch (error) {
      console.error('Failed to delete expense', error)
      alert('支出の削除に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expense) return null

  const currentTags = formData.tags || []
  const currentCategory = formData.bigCategory || expense.bigCategory

  return (
    <div className="expense-modal-overlay" onClick={onClose}>
      <div className="expense-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="expense-modal-header">
          <h2>支出の編集</h2>
          <button className="expense-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="expense-modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="modal-date">日付 <span className="required">*</span></label>
              <input
                type="date"
                id="modal-date"
                value={
                  formData.date instanceof Date
                    ? formData.date.toISOString().split('T')[0]
                    : typeof formData.date === 'string'
                    ? formData.date
                    : formData.date
                    ? new Date(formData.date).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setFormData({ ...formData, date: new Date(e.target.value) })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="modal-amount">金額 <span className="required">*</span></label>
              <input
                type="number"
                id="modal-amount"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="modal-category">カテゴリー <span className="required">*</span></label>
              {loadingCategories ? (
                <p>読み込み中...</p>
              ) : (
                <select
                  id="modal-category"
                  value={currentCategory}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      bigCategory: e.target.value,
                      tags: [],
                    })
                  }}
                  required
                >
                  <option value="">選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="modal-payment">支払い方法 <span className="required">*</span></label>
              <select
                id="modal-payment"
                value={formData.paymentMethod || ''}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                required
              >
                <option value="">選択してください</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>タグ</label>
            {!currentCategory ? (
              <p className="tag-hint">カテゴリーを選択するとタグが表示されます</p>
            ) : loadingTags ? (
              <p>読み込み中...</p>
            ) : filteredTags.length === 0 ? (
              <p>このカテゴリーに紐づくタグがありません</p>
            ) : (
              <div className="tags-selection">
                {filteredTags.map((tag) => (
                  <label key={tag.id} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={currentTags.includes(tag.name)}
                      onChange={() => handleTagToggle(tag.name)}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="modal-description">説明</label>
            <textarea
              id="modal-description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="メモや詳細を入力（任意）"
              rows={3}
            />
          </div>

          <div className="expense-modal-actions">
            <button
              type="button"
              className="delete-button"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? '削除中...' : '削除'}
            </button>
            <div className="expense-modal-actions-right">
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

