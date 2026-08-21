import { Link } from 'react-router-dom'
import type { Expense, MonthlyBudget } from '../types'
import { buildScopedBudgetProgress } from '../utils/budgetSpentBreakdown'
import './BudgetScopedProgress.css'

export type BudgetScopedProgressProps = {
  expenses: Expense[]
  categoryBudgets: MonthlyBudget[]
  tagBudgets: MonthlyBudget[]
  loading?: boolean
  budgetSettingsTo: string
}

function formatYen(n: number): string {
  const abs = Math.round(Math.abs(n)).toLocaleString()
  return n < 0 ? `−¥${abs}` : `¥${abs}`
}

/**
 * ダッシュボード用：カテゴリー別・タグ別予算の消化状況。
 */
export function BudgetScopedProgress({
  expenses,
  categoryBudgets,
  tagBudgets,
  loading,
  budgetSettingsTo,
}: BudgetScopedProgressProps) {
  if (loading) {
    return (
      <p className="budget-scoped budget-scoped--loading" aria-live="polite">
        カテゴリー・タグ予算を読み込み中…
      </p>
    )
  }

  const rows = buildScopedBudgetProgress([...categoryBudgets, ...tagBudgets], expenses)
  if (rows.length === 0) {
    return null
  }

  const categories = rows.filter((r) => r.kind === 'category')
  const tags = rows.filter((r) => r.kind === 'tag')

  return (
    <div className="budget-scoped">
      {categories.length > 0 && (
        <section className="budget-scoped-section" aria-labelledby="budget-scoped-cat-heading">
          <div className="budget-scoped-head">
            <h3 id="budget-scoped-cat-heading" className="budget-scoped-title">
              カテゴリー別予算
            </h3>
            <Link to={budgetSettingsTo} className="budget-scoped-edit-link">
              編集
            </Link>
          </div>
          <ul className="budget-scoped-list">
            {categories.map((row) => (
              <ScopedRow key={row.key} row={row} />
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section className="budget-scoped-section" aria-labelledby="budget-scoped-tag-heading">
          <div className="budget-scoped-head">
            <h3 id="budget-scoped-tag-heading" className="budget-scoped-title">
              タグ別予算
            </h3>
            <Link to={budgetSettingsTo} className="budget-scoped-edit-link">
              編集
            </Link>
          </div>
          <ul className="budget-scoped-list">
            {tags.map((row) => (
              <ScopedRow key={row.key} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ScopedRow({
  row,
}: {
  row: ReturnType<typeof buildScopedBudgetProgress>[number]
}) {
  const barPct = Number.isFinite(row.ratio) ? Math.min(100, row.ratio * 100) : 100
  const statusText = row.over
    ? `${formatYen(row.used - row.limit)} 超過。上限 ${formatYen(row.limit)}、使用 ${formatYen(row.used)}。`
    : `残り ${formatYen(row.remaining)}。上限 ${formatYen(row.limit)}、使用 ${formatYen(row.used)}。`

  return (
    <li className={`budget-scoped-row${row.over ? ' budget-scoped-row--over' : ''}`}>
      <div className="budget-scoped-row-top">
        <span className="budget-scoped-label">{row.label}</span>
        <span className="budget-scoped-amounts" aria-live="polite">
          {row.over ? (
            <>
              <span className="budget-scoped-over-icon" aria-hidden="true">
                ⚠
              </span>
              {formatYen(row.used - row.limit)} 超過
            </>
          ) : (
            <>残り {formatYen(row.remaining)}</>
          )}
        </span>
      </div>
      <div
        className={`budget-scoped-track${row.over ? ' budget-scoped-track--over' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={row.over ? 100 : Math.round(barPct)}
        aria-label={`${row.kind === 'category' ? 'カテゴリー' : 'タグ'}「${row.label}」の予算消化率`}
        aria-valuetext={statusText}
      >
        <div className="budget-scoped-fill" style={{ width: `${barPct}%` }} />
      </div>
      <p className="budget-scoped-meta">
        {formatYen(row.used)} / {formatYen(row.limit)}
        {Number.isFinite(row.ratio) ? `（${Math.round(row.ratio * 100)}%）` : ''}
      </p>
    </li>
  )
}
