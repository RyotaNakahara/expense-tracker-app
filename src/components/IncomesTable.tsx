import { formatDate, formatDateTime } from '../utils/dateUtils'
import type { Income } from '../types'
import './ExpensesTable.css'

interface IncomesTableProps {
  incomes: Income[]
  loading: boolean
  onIncomeClick: (income: Income) => void
}

export const IncomesTable = ({ incomes, loading, onIncomeClick }: IncomesTableProps) => {
  if (loading) {
    return <p>読み込み中…</p>
  }

  if (incomes.length === 0) {
    return <p>収入データがありません。</p>
  }

  return (
    <div className="expenses-table-container">
      <table className="expenses-table">
        <thead>
          <tr>
            <th className="col-date">日付</th>
            <th className="col-amount">金額</th>
            <th className="col-category">カテゴリ</th>
            <th className="col-description">説明</th>
            <th className="col-created">作成日時</th>
            <th className="col-updated">更新日時</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map((income) => (
            <tr key={income.id} onClick={() => onIncomeClick(income)} className="expense-row">
              <td className="col-date">{formatDate(income.date)}</td>
              <td className="col-amount income-amount">¥{income.amount.toLocaleString()}</td>
              <td className="col-category">{income.category}</td>
              <td className="col-description">{income.description}</td>
              <td className="col-created datetime-cell">{formatDateTime(income.createdAt)}</td>
              <td className="col-updated datetime-cell">{formatDateTime(income.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
