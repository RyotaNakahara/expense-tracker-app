import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/testUtils'
import { BudgetProgressBar } from './BudgetProgressBar'

describe('BudgetProgressBar', () => {
  it('shows unset message and settings link when limit is null', () => {
    render(
      <BudgetProgressBar used={0} limit={null} budgetSettingsTo="/budget?year=2026&month=4" />
    )
    expect(screen.getByText(/予算はまだ設定されていません/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '予算を設定' })).toHaveAttribute(
      'href',
      '/budget?year=2026&month=4'
    )
  })

  it('shows progressbar and remaining when under budget', () => {
    render(
      <BudgetProgressBar used={40_000} limit={100_000} budgetSettingsTo="/budget?year=2026&month=4" />
    )
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText(/残り/)).toBeInTheDocument()
    expect(screen.getByText(/60/)).toBeInTheDocument()
  })

  it('includes income in available budget', () => {
    render(
      <BudgetProgressBar
        used={40_000}
        limit={100_000}
        income={20_000}
        budgetSettingsTo="/budget"
      />
    )
    // 40/120 ≈ 33%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText(/収入/)).toBeInTheDocument()
    expect(screen.getByText(/残り/)).toBeInTheDocument()
  })

  it('includes carry-in in available budget', () => {
    render(
      <BudgetProgressBar
        used={40_000}
        limit={100_000}
        carryIn={20_000}
        budgetSettingsTo="/budget"
      />
    )
    // 40/120 ≈ 33%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText(/繰越/)).toBeInTheDocument()
    expect(screen.getByText(/残り/)).toBeInTheDocument()
  })

  it('includes negative carry-in in available budget', () => {
    render(
      <BudgetProgressBar
        used={40_000}
        limit={100_000}
        carryIn={-20_000}
        budgetSettingsTo="/budget"
      />
    )
    // 40/80 = 50%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText(/繰越/)).toBeInTheDocument()
  })

  it('shows over state when used exceeds limit', () => {
    render(
      <BudgetProgressBar used={120_000} limit={100_000} budgetSettingsTo="/budget" />
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(/超過/)).toBeInTheDocument()
  })

  it('shows loading text when loading', () => {
    render(
      <BudgetProgressBar used={0} limit={100_000} loading budgetSettingsTo="/budget" />
    )
    expect(screen.getByText(/予算を読み込み中/)).toBeInTheDocument()
  })
})
