import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/testUtils'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { IncomesTable } from './IncomesTable'
import type { Income } from '../types'

const ts = Timestamp.fromDate(new Date('2026-03-15T12:00:00Z'))

const incomes: Income[] = [
  {
    id: 'i1',
    date: ts,
    amount: 250000,
    userId: 'u1',
    category: '給与',
    description: '3月分',
    createdAt: ts,
    updatedAt: ts,
  },
]

describe('IncomesTable', () => {
  it('shows loading state', () => {
    render(<IncomesTable incomes={[]} loading onIncomeClick={vi.fn()} />)
    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('shows empty message', () => {
    render(<IncomesTable incomes={[]} loading={false} onIncomeClick={vi.fn()} />)
    expect(screen.getByText('収入データがありません。')).toBeInTheDocument()
  })

  it('renders rows and handles click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IncomesTable incomes={incomes} loading={false} onIncomeClick={onClick} />)

    expect(screen.getByText('給与')).toBeInTheDocument()
    expect(screen.getByText('¥250,000')).toBeInTheDocument()
    expect(screen.getByText('3月分')).toBeInTheDocument()

    await user.click(screen.getByText('給与'))
    expect(onClick).toHaveBeenCalledWith(incomes[0])
  })
})
