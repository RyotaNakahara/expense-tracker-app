import { Link } from 'react-router-dom'
import './BudgetProgressBar.css'

export type BudgetProgressBarProps = {
  /** 当月の支出合計（円） */
  used: number
  /** 月次予算の上限（円）。null は未設定 */
  limit: number | null
  /** 前月からの繰入（円） */
  carryIn?: number
  /** 当月の収入合計（円）。有効予算に加算 */
  income?: number
  loading?: boolean
  /** 予算設定ページへのパス（クエリ付き可） */
  budgetSettingsTo: string
}

function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`
}

/**
 * ダッシュボード用：全体予算（＋繰入＋収入）に対する消化率と残り／超過を表示する。
 */
export function BudgetProgressBar({
  used,
  limit,
  carryIn = 0,
  income = 0,
  loading,
  budgetSettingsTo,
}: BudgetProgressBarProps) {
  if (loading) {
    return (
      <p className="budget-progress budget-progress--loading" aria-live="polite">
        予算を読み込み中…
      </p>
    )
  }

  if (limit === null || limit <= 0) {
    return (
      <div className="budget-progress budget-progress--unset">
        <p className="budget-progress-unset-text" id="budget-progress-unset-desc">
          この月の予算はまだ設定されていません。
        </p>
        <Link
          to={budgetSettingsTo}
          className="budget-progress-settings-link"
          aria-describedby="budget-progress-unset-desc"
        >
          予算を設定
        </Link>
      </div>
    )
  }

  const safeCarryIn = carryIn
  const safeIncome = Number.isFinite(income) ? income : 0
  const available = limit + safeCarryIn + safeIncome
  const ratio = available > 0 ? used / available : used > 0 ? Number.POSITIVE_INFINITY : 0
  const over = used > available
  const barPct =
    available > 0 ? Math.min(100, (used / available) * 100) : used > 0 ? 100 : 0
  const ariaValuenow = available > 0 ? Math.round(Math.min(100, (used / available) * 100)) : over ? 100 : 0
  const remaining = available - used
  const carryLabel =
    safeCarryIn === 0
      ? ''
      : safeCarryIn > 0
        ? ` + 繰越 ${formatYen(safeCarryIn)}`
        : ` − 繰越不足 ${formatYen(Math.abs(safeCarryIn))}`
  const incomeLabel = safeIncome > 0 ? ` + 収入 ${formatYen(safeIncome)}` : ''
  const statusText = over
    ? `${formatYen(used - available)} 超過。有効予算 ${formatYen(available)}（予算 ${formatYen(limit)}${carryLabel}${incomeLabel}）、使用額 ${formatYen(used)}。`
    : `残り ${formatYen(remaining)}。有効予算 ${formatYen(available)}（予算 ${formatYen(limit)}${carryLabel}${incomeLabel}）、使用額 ${formatYen(used)}。`

  const rateExtraParts: string[] = []
  if (safeCarryIn > 0) rateExtraParts.push(`繰越 ${formatYen(safeCarryIn)}`)
  else if (safeCarryIn < 0) rateExtraParts.push(`繰越 ${formatYen(safeCarryIn)}`)
  if (safeIncome > 0) rateExtraParts.push(`収入 ${formatYen(safeIncome)}`)
  const rateExtra = rateExtraParts.length > 0 ? ` · ${rateExtraParts.join(' · ')}` : ''

  return (
    <div className="budget-progress budget-progress--active">
      <div
        className={`budget-progress-track ${over ? 'budget-progress-track--over' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={over ? 100 : ariaValuenow}
        aria-label="月全体の有効予算に対する支出の割合"
        aria-valuetext={statusText}
      >
        <div className="budget-progress-fill" style={{ width: `${barPct}%` }} />
      </div>
      <div className="budget-progress-meta">
        <span className="budget-progress-remaining" aria-live="polite">
          {over ? (
            <>
              <span className="budget-progress-over-icon" aria-hidden="true">
                ⚠
              </span>
              <span>{formatYen(used - available)} 超過</span>
            </>
          ) : (
            <span>残り {formatYen(remaining)}</span>
          )}
        </span>
        <span className="budget-progress-rate" aria-hidden="true">
          {Number.isFinite(ratio) ? `${Math.round(ratio * 100)}% 使用` : '—'}
          {rateExtra}
        </span>
        <Link to={budgetSettingsTo} className="budget-progress-settings-link budget-progress-settings-link--inline">
          予算を編集
        </Link>
      </div>
    </div>
  )
}
