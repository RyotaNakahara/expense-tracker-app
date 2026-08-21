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
    getMonthlyTotalForDisplay: vi.fn(),
    getExpenseCountInMonth: vi.fn(),
    getExpensesPageForMonth: vi.fn(),
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
    vi.mocked(expenseService.getMonthlyTotalForDisplay).mockResolvedValue(0)
    vi.mocked(expenseService.getExpenseCountInMonth).mockResolvedValue(0)
    vi.mocked(expenseService.getExpensesPageForMonth).mockResolvedValue({
      expenses: [],
      lastDoc: null,
      hasMore: false,
    })
  })

  it('does not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useDashboardExpenses(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesPageForMonth).not.toHaveBeenCalled()
    expect(result.current.expenses).toEqual([])
    expect(result.current.monthExpenseCount).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('loads totals + first page without getExpensesInMonth', async () => {
    const list = [makeExpense('a', 100), makeExpense('b', 200)]
    vi.mocked(expenseService.getMonthlyTotalForDisplay).mockResolvedValue(300)
    vi.mocked(expenseService.getExpenseCountInMonth).mockResolvedValue(2)
    vi.mocked(expenseService.getExpensesPageForMonth).mockResolvedValue({
      expenses: list,
      lastDoc: null,
      hasMore: false,
    })

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const ym = getCurrentYearMonth()
    expect(expenseService.getMonthlyTotalForDisplay).toHaveBeenCalledWith('user-1', ym.year, ym.month)
    expect(expenseService.getExpenseCountInMonth).toHaveBeenCalledWith('user-1', ym.year, ym.month)
    expect(expenseService.getExpensesPageForMonth).toHaveBeenCalledWith(
      'user-1',
      ym.year,
      ym.month,
      DASHBOARD_EXPENSE_PAGE_SIZE
    )
    expect(expenseService.getExpensesInMonth).not.toHaveBeenCalled()
    expect(result.current.monthExpenseCount).toBe(2)
    expect(result.current.monthlyTotal).toBe(300)
    expect(result.current.expenses).toHaveLength(2)
    expect(result.current.error).toBeNull()
    expect(expenseService.getExpensesByUserId).not.toHaveBeenCalled()
  })

  it('pages with server fetch when page 2 is requested', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => makeExpense(`p1-${i}`, i + 1))
    const page2 = [makeExpense('p2-0', 11), makeExpense('p2-1', 12)]
    const fakeLastDoc = { id: 'cursor' } as never

    vi.mocked(expenseService.getMonthlyTotalForDisplay).mockResolvedValue(78)
    vi.mocked(expenseService.getExpenseCountInMonth).mockResolvedValue(12)
    vi.mocked(expenseService.getExpensesPageForMonth)
      .mockResolvedValueOnce({
        expenses: page1,
        lastDoc: fakeLastDoc,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        expenses: page2,
        lastDoc: null,
        hasMore: false,
      })

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.expenses).toHaveLength(DASHBOARD_EXPENSE_PAGE_SIZE)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.currentPage).toBe(1)

    await act(async () => {
      await result.current.goToPage(2)
    })

    expect(result.current.expenses).toHaveLength(2)
    expect(result.current.currentPage).toBe(2)
  })

  it('sets error and clears data when page load fails without calling getExpensesByUserId', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(expenseService.getExpensesPageForMonth).mockRejectedValue(new Error('index required'))

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
    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const initial = getCurrentYearMonth()
    expect(expenseService.getExpensesPageForMonth).toHaveBeenCalledWith(
      'user-1',
      initial.year,
      initial.month,
      DASHBOARD_EXPENSE_PAGE_SIZE
    )

    vi.mocked(expenseService.getExpensesPageForMonth).mockClear()

    act(() => {
      result.current.setSelectedYearMonth(2025, 1)
    })

    await waitFor(() => {
      expect(expenseService.getExpensesPageForMonth).toHaveBeenCalledWith(
        'user-1',
        2025,
        1,
        DASHBOARD_EXPENSE_PAGE_SIZE
      )
    })

    expect(result.current.selectedYearMonth).toEqual({ year: 2025, month: 1 })
  })

  it('refreshAfterMutation reloads data', async () => {
    vi.mocked(expenseService.getExpenseCountInMonth)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
    vi.mocked(expenseService.getMonthlyTotalForDisplay)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(30)
    vi.mocked(expenseService.getExpensesPageForMonth)
      .mockResolvedValueOnce({
        expenses: [makeExpense('x', 10)],
        lastDoc: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        expenses: [makeExpense('x', 10), makeExpense('y', 20)],
        lastDoc: null,
        hasMore: false,
      })

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

    expect(expenseService.getExpensesPageForMonth).toHaveBeenCalledTimes(2)
  })

  it('ensureMonthExpensesAll loads full month only when requested', async () => {
    const full = [makeExpense('a', 1), makeExpense('b', 2)]
    vi.mocked(expenseService.getExpensesInMonth).mockResolvedValue(full)

    const { result } = renderHook(() => useDashboardExpenses('user-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(expenseService.getExpensesInMonth).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.ensureMonthExpensesAll()
    })

    expect(expenseService.getExpensesInMonth).toHaveBeenCalledTimes(1)
    expect(result.current.monthExpensesAll).toEqual(full)
  })
})
