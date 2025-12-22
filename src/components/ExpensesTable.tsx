import { formatDate, formatDateTime } from '../utils/dateUtils'
import type { Expense } from '../types'
import './ExpensesTable.css'

interface ExpensesTableProps {
  expenses: Expense[]
  loading: boolean
  onExpenseClick: (expense: Expense) => void
}

export const ExpensesTable = ({ expenses, loading, onExpenseClick }: ExpensesTableProps) => {
  if (loading) {
    return <p>読み込み中…</p>
  }

  if (expenses.length === 0) {
    return <p>支出データがありません。</p>
  }

  return (
    <div className="expenses-table-container">
      <table className="expenses-table">
        <thead>
          <tr>
            <th className="col-date">日付</th>
            <th className="col-amount">金額</th>
            <th className="col-category">カテゴリ</th>
            <th className="col-tags">タグ</th>
            <th className="col-description">説明</th>
            <th className="col-payment">支払い方法</th>
            <th className="col-created">作成日時</th>
            <th className="col-updated">更新日時</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} onClick={() => onExpenseClick(expense)} className="expense-row">
              <td className="col-date">{formatDate(expense.date)}</td>
              <td className="col-amount expense-amount">¥{expense.amount.toLocaleString()}</td>
              <td className="col-category">{expense.bigCategory}</td>
              <td className="col-tags">{expense.tags}</td>
              <td className="col-description">{expense.description}</td>
              <td className="col-payment">{expense.paymentMethod}</td>
              <td className="col-created datetime-cell">{formatDateTime(expense.createdAt)}</td>
              <td className="col-updated datetime-cell">{formatDateTime(expense.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

