import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIncomeMutations } from '../hooks/useIncomeMutations'
import { useIncomeCategories } from '../hooks/useIncomeCategories'
import { getInitialIncomeFormData } from '../utils/formUtils'
import './ExpenseForm.css'

interface IncomeFormProps {
  userId: string
  onSuccess: () => void
}

export const IncomeForm = ({ userId, onSuccess }: IncomeFormProps) => {
  const [formData, setFormData] = useState(getInitialIncomeFormData())
  const [submitting, setSubmitting] = useState(false)
  const { createIncome } = useIncomeMutations(userId)
  const { categories, loading: loadingCategories } = useIncomeCategories()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.amount || !formData.category) {
      alert('必須項目を入力してください')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('有効な金額を入力してください')
      return
    }

    setSubmitting(true)
    try {
      await createIncome({
        date: new Date(formData.date),
        amount,
        category: formData.category,
        description: formData.description,
      })
      setFormData(getInitialIncomeFormData())
      onSuccess()
    } catch (error) {
      console.error('Failed to save income', error)
      alert('収入の登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="expense-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="income-date">
            日付 <span className="required">*</span>
          </label>
          <input
            type="date"
            id="income-date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="income-amount">
            金額 <span className="required">*</span>
          </label>
          <input
            type="number"
            id="income-amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
            min="0"
            step="1"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="income-category">
          カテゴリー <span className="required">*</span>
        </label>
        {loadingCategories ? (
          <p className="form-hint">カテゴリーを読み込み中…</p>
        ) : categories.length === 0 ? (
          <p className="form-hint">
            収入カテゴリーがありません。
            <Link to="/category-tag-management">カテゴリー・タグ管理</Link>
            から追加してください。
          </p>
        ) : (
          <select
            id="income-category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="income-description">説明</label>
        <input
          type="text"
          id="income-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="任意"
        />
      </div>

      <button
        type="submit"
        className="submit-button"
        disabled={submitting || loadingCategories || categories.length === 0}
      >
        {submitting ? '登録中…' : '収入を登録'}
      </button>
    </form>
  )
}
