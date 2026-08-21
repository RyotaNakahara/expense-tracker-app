import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useIncomeMutations } from '../hooks/useIncomeMutations'
import { useIncomeCategories } from '../hooks/useIncomeCategories'
import type { Income, UpdateIncomeInput } from '../types'
import './ExpenseModal.css'

interface IncomeModalProps {
  income: Income | null
  userId: string
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

export const IncomeModal = ({ income, userId, onClose, onUpdate, onDelete }: IncomeModalProps) => {
  const [formData, setFormData] = useState<UpdateIncomeInput>({})
  const [dateStr, setDateStr] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { updateIncome, deleteIncome } = useIncomeMutations(userId)
  const { categories, loading: loadingCategories } = useIncomeCategories()

  useEffect(() => {
    if (income) {
      const d = income.date.toDate()
      setDateStr(d.toISOString().split('T')[0])
      setAmountStr(String(income.amount))
      setFormData({
        date: d,
        amount: income.amount,
        category: income.category,
        description: income.description || '',
      })
    }
  }, [income])

  if (!income) return null

  const categoryOptions = [...categories]
  if (
    formData.category &&
    !categories.some((c) => c.name === formData.category)
  ) {
    categoryOptions.push({ id: '__current__', name: formData.category })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category || !dateStr || !amountStr) {
      alert('必須項目を入力してください')
      return
    }
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      alert('有効な金額を入力してください')
      return
    }

    setSubmitting(true)
    try {
      await updateIncome(income.id, {
        date: new Date(dateStr),
        amount,
        category: formData.category,
        description: formData.description ?? '',
      })
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Failed to update income', error)
      alert('収入の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この収入を削除してもよろしいですか？')) return
    setSubmitting(true)
    try {
      await deleteIncome(income.id)
      onDelete()
      onClose()
    } catch (error) {
      console.error('Failed to delete income', error)
      alert('収入の削除に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="expense-modal-overlay" onClick={onClose}>
      <div className="expense-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="expense-modal-header">
          <h2>収入の編集</h2>
          <button type="button" className="expense-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="expense-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-income-date">
                日付 <span className="required">*</span>
              </label>
              <input
                type="date"
                id="edit-income-date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-income-amount">
                金額 <span className="required">*</span>
              </label>
              <input
                type="number"
                id="edit-income-amount"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                min="0"
                step="1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-income-category">
              カテゴリー <span className="required">*</span>
            </label>
            {loadingCategories ? (
              <p>カテゴリーを読み込み中…</p>
            ) : categoryOptions.length === 0 ? (
              <p>
                収入カテゴリーがありません。
                <Link to="/category-tag-management">管理画面</Link>
                から追加してください。
              </p>
            ) : (
              <select
                id="edit-income-category"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">選択してください</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="edit-income-description">説明</label>
            <input
              type="text"
              id="edit-income-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="expense-modal-actions">
            <button
              type="button"
              className="delete-button"
              disabled={submitting}
              onClick={() => void handleDelete()}
            >
              削除
            </button>
            <div className="expense-modal-actions-right">
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
