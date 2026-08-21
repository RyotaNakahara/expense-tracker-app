import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { useExpenses } from './useExpenses'
import { expenseService } from '../services/expenseService'
import type { Expense } from '../types'

vi.mock('../services/expenseService', () => ({
  expenseService: {
    getExpensesInMonth: vi.fn(),
    getExpensesByUserId: vi.fn(),
    getExpensesForRecentMonths: vi.fn(),
  },
}))

vi.mock('./useExpenseMutations', () => ({
  useExpenseMutations: () => ({
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
  }),
}))

function makeExpense(id: string): Expense {
  const ts = Timestamp.now()
  return {
    id,
    date: ts,
    amount: 100,
    userId: 'u1',
    bigCategory: '食費',
    tags: '',
    paymentMethod: '',
    description: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads month data when year and month are set', async () => {
    vi.mocked(expenseService.getExpensesInMonth).mockResolvedValue([makeExpense('a')])

    const { result } = renderHook(() =>
      useExpenses('u1', { year: 2026, month: 3 })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesInMonth).toHaveBeenCalledWith('u1', 2026, 3)
    expect(expenseService.getExpensesByUserId).not.toHaveBeenCalled()
    expect(result.current.expenses).toHaveLength(1)
  })

  it('loads recent months when recentMonths is set', async () => {
    vi.mocked(expenseService.getExpensesForRecentMonths).mockResolvedValue([
      makeExpense('r1'),
      makeExpense('r2'),
    ])

    const { result } = renderHook(() => useExpenses('u1', { recentMonths: 24 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesForRecentMonths).toHaveBeenCalledWith('u1', 24)
    expect(expenseService.getExpensesByUserId).not.toHaveBeenCalled()
    expect(result.current.expenses).toHaveLength(2)
  })

  it('falls back to all expenses when no scope options', async () => {
    vi.mocked(expenseService.getExpensesByUserId).mockResolvedValue([makeExpense('all')])

    const { result } = renderHook(() => useExpenses('u1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesByUserId).toHaveBeenCalledWith('u1')
  })
})
