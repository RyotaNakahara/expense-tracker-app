import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  useDashboardExpenses,
  getCurrentYearMonth,
  DASHBOARD_EXPENSE_PAGE_SIZE,
} from './useDashboardExpenses'
import { expenseService } from '../services/expenseService'
import type { Expense } from '../types'

vi.mock('../services/expenseService', () => ({
  expenseService: {
    getExpensesInMonth: vi.fn(),
    getExpensesByUserId: vi.fn(),
  },
}))

function makeExpense(id: string, amount: number): Expense {
  const ts = Timestamp.fromDate(new Date('2026-03-15T12:00:00Z'))
  return {
    id,
    date: ts,
    amount,
    userId: 'user-1',
    bigCategory: '食費',
    tags: '',
    paymentMethod: '',
    description: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

describe('getCurrentYearMonth', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns calendar year and 1-based month for mocked date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T08:00:00Z'))
    expect(getCurrentYearMonth()).toEqual({ year: 2026, month: 6 })
  })
})

describe('useDashboardExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useDashboardExpenses(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesInMonth).not.toHaveBeenCalled()
    expect(result.current.expenses).toEqual([])
    expect(result.current.monthExpenseCount).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('loads month data via getExpensesInMonth and exposes monthExpenseCount', async () => {
    const list = [makeExpense('a', 100), makeExpense('b', 200)]
    vi.mocked(expenseService.getExpensesInMonth).mockResolvedValue(list)

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const ym = getCurrentYearMonth()
    expect(expenseService.getExpensesInMonth).toHaveBeenCalledWith('user-1', ym.year, ym.month)
    expect(result.current.monthExpenseCount).toBe(2)
    expect(result.current.monthlyTotal).toBe(300)
    expect(result.current.expenses).toHaveLength(2)
    expect(result.current.error).toBeNull()
    expect(expenseService.getExpensesByUserId).not.toHaveBeenCalled()
  })

  it('pages client-side with DASHBOARD_EXPENSE_PAGE_SIZE', async () => {
    const list = Array.from({ length: 12 }, (_, i) => makeExpense(`id-${i}`, i + 1))
    vi.mocked(expenseService.getExpensesInMonth).mockResolvedValue(list)

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.expenses).toHaveLength(DASHBOARD_EXPENSE_PAGE_SIZE)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.currentPage).toBe(1)

    act(() => {
      void result.current.goToPage(2)
    })

    expect(result.current.expenses).toHaveLength(2)
    expect(result.current.currentPage).toBe(2)
  })

  it('sets error and clears data when getExpensesInMonth fails without calling getExpensesByUserId', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(expenseService.getExpensesInMonth).mockRejectedValue(new Error('index required'))

      const { result } = renderHook(() => useDashboardExpenses('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error?.message).toBe('index required')
      expect(result.current.expenses).toEqual([])
      expect(result.current.monthExpenseCount).toBe(0)
      expect(result.current.monthlyTotal).toBe(0)
      expect(expenseService.getExpensesByUserId).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('reloads when setSelectedYearMonth changes target month', async () => {
    vi.mocked(expenseService.getExpensesInMonth).mockResolvedValue([])

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const initial = getCurrentYearMonth()
    expect(expenseService.getExpensesInMonth).toHaveBeenCalledWith('user-1', initial.year, initial.month)

    vi.mocked(expenseService.getExpensesInMonth).mockClear()

    act(() => {
      result.current.setSelectedYearMonth(2025, 1)
    })

    await waitFor(() => {
      expect(expenseService.getExpensesInMonth).toHaveBeenCalledWith('user-1', 2025, 1)
    })

    expect(result.current.selectedYearMonth).toEqual({ year: 2025, month: 1 })
  })

  it('refreshAfterMutation reloads data', async () => {
    vi.mocked(expenseService.getExpensesInMonth)
      .mockResolvedValueOnce([makeExpense('x', 10)])
      .mockResolvedValueOnce([makeExpense('x', 10), makeExpense('y', 20)])

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.monthExpenseCount).toBe(1)

    await act(async () => {
      await result.current.refreshAfterMutation()
    })

    await waitFor(() => {
      expect(result.current.monthExpenseCount).toBe(2)
    })

    expect(expenseService.getExpensesInMonth).toHaveBeenCalledTimes(2)
  })
})
