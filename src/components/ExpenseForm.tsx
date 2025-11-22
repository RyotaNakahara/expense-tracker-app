import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { expenseService } from '../services/expenseService'
import { categoryService } from '../services/categoryService'
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories'
import { PAYMENT_METHODS } from '../constants/paymentMethods'
import { getInitialExpenseFormData } from '../utils/formUtils'
import type { Category } from '../types'
import './ExpenseForm.css'

interface ExpenseFormProps {
  userId: string
  onSuccess: () => void
}

export const ExpenseForm = ({ userId, onSuccess }: ExpenseFormProps) => {
  const [formData, setFormData] = useState(getInitialExpenseFormData())
  const [submitting, setSubmitting] = useState<boolean>(false)
  const { categories, loading: loadingCategories, refreshCategories } = useCategories()

  // 選択されたカテゴリーIDを取得
  const selectedCategoryId = categories.find(
    (cat: Category) => cat.name === formData.bigCategory
  )?.id

  const { filteredTags, loading: loadingTags } = useTags(selectedCategoryId)

  const handleTagToggle = (tagName: string) => {
    setFormData((prev) => {
      const newTags = prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName]
      return { ...prev, tags: newTags }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.amount || !formData.bigCategory || !formData.paymentMethod) {
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
      await expenseService.createExpense(userId, {
        date: new Date(formData.date),
        amount: amount,
        bigCategory: formData.bigCategory,
        tags: formData.tags,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
      })

      setFormData(getInitialExpenseFormData())
      onSuccess()
    } catch (error) {
      console.error('Failed to save expense', error)
      alert('支出の登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const initializeData = async () => {
    try {
      const existingCategoryNames = new Set(categories.map((cat) => cat.name.toLowerCase()))

      for (const categoryName of DEFAULT_CATEGORIES) {
        if (!existingCategoryNames.has(categoryName.toLowerCase())) {
          await categoryService.createCategory({ name: categoryName })
        }
      }

      await refreshCategories()
      alert('初期データを追加しました')
    } catch (error) {
      console.error('Failed to initialize data', error)
      alert('初期データの追加に失敗しました')
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">日付 <span className="required">*</span></label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">金額 <span className="required">*</span></label>
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
            min="0"
            step="1"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="bigCategory">カテゴリー <span className="required">*</span></label>
          {loadingCategories ? (
            <p>読み込み中...</p>
          ) : categories.length === 0 ? (
            <div className="empty-data-message">
              <p>カテゴリーが登録されていません</p>
              <button
                type="button"
                className="initialize-data-button"
                onClick={initializeData}
              >
                初期データを追加
              </button>
            </div>
          ) : (
            <select
              id="bigCategory"
              value={formData.bigCategory}
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
          <label htmlFor="paymentMethod">支払い方法 <span className="required">*</span></label>
          <select
            id="paymentMethod"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
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
        {!formData.bigCategory ? (
          <p className="tag-hint">カテゴリーを選択するとタグが表示されます</p>
        ) : loadingTags ? (
          <p>読み込み中...</p>
        ) : filteredTags.length === 0 ? (
          <div className="empty-data-message">
            <p>このカテゴリーに紐づくタグがありません</p>
          </div>
        ) : (
          <div className="tags-selection">
            {filteredTags.map((tag) => (
              <label key={tag.id} className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={formData.tags.includes(tag.name)}
                  onChange={() => handleTagToggle(tag.name)}
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description">説明</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="メモや詳細を入力（任意）"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            setFormData(getInitialExpenseFormData())
          }}
          disabled={submitting}
        >
          キャンセル
        </button>
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}

