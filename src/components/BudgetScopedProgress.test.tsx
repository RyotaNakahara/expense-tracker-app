import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/testUtils'
import { Timestamp } from 'firebase/firestore'
import { BudgetScopedProgress } from './BudgetScopedProgress'
import type { Expense, MonthlyBudget } from '../types'

const ts = Timestamp.now()

const expenses: Expense[] = [
  {
    id: '1',
    date: ts,
    amount: 4000,
    userId: 'u1',
    bigCategory: '食費',
    tags: 'ランチ',
    paymentMethod: '',
    description: '',
    createdAt: ts,
    updatedAt: ts,
  },
]

const categoryBudgets: MonthlyBudget[] = [
  {
    id: 'c',
    userId: 'u1',
    year: 2026,
    month: 4,
    amountLimit: 10000,
    categoryId: 'cat1',
    categoryName: '食費',
    tagId: null,
    tagName: null,
    updatedAt: ts,
  },
]

const tagBudgets: MonthlyBudget[] = [
  {
    id: 't',
    userId: 'u1',
    year: 2026,
    month: 4,
    amountLimit: 3000,
    categoryId: null,
    categoryName: null,
    tagId: 'tag1',
    tagName: 'ランチ',
    updatedAt: ts,
  },
]

describe('BudgetScopedProgress', () => {
  it('renders nothing when no scoped budgets', () => {
    const { container } = render(
      <BudgetScopedProgress
        expenses={expenses}
        categoryBudgets={[]}
        tagBudgets={[]}
        budgetSettingsTo="/budget"
      />
    )
    expect(container.querySelector('.budget-scoped')).toBeNull()
  })

  it('shows category and tag progress with remaining/over', () => {
    render(
      <BudgetScopedProgress
        expenses={expenses}
        categoryBudgets={categoryBudgets}
        tagBudgets={tagBudgets}
        budgetSettingsTo="/budget?year=2026&month=4"
      />
    )
    expect(screen.getByText('カテゴリー別予算')).toBeInTheDocument()
    expect(screen.getByText('タグ別予算')).toBeInTheDocument()
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('ランチ')).toBeInTheDocument()
    expect(screen.getByText(/残り/)).toBeInTheDocument()
    expect(screen.getByText(/超過/)).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
  })

  it('shows loading text', () => {
    render(
      <BudgetScopedProgress
        expenses={[]}
        categoryBudgets={[]}
        tagBudgets={[]}
        loading
        budgetSettingsTo="/budget"
      />
    )
    expect(screen.getByText(/カテゴリー・タグ予算を読み込み中/)).toBeInTheDocument()
  })
})
