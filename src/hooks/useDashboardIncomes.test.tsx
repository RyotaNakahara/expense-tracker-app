import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  useDashboardIncomes,
  DASHBOARD_INCOME_PAGE_SIZE,
} from './useDashboardIncomes'
import { incomeService } from '../services/incomeService'
import type { Income } from '../types'

vi.mock('../services/incomeService', () => ({
  incomeService: {
    getMonthlyIncomeTotalForDisplay: vi.fn(),
    getIncomesInMonth: vi.fn(),
  },
}))

function makeIncome(id: string, amount: number): Income {
  const ts = Timestamp.fromDate(new Date('2026-03-15T12:00:00Z'))
  return {
    id,
    date: ts,
    amount,
    userId: 'user-1',
    category: '給与',
    description: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

const ym = { year: 2026, month: 3 }

describe('useDashboardIncomes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(incomeService.getMonthlyIncomeTotalForDisplay).mockResolvedValue(0)
    vi.mocked(incomeService.getIncomesInMonth).mockResolvedValue([])
  })

  it('loads total only when list is disabled', async () => {
    vi.mocked(incomeService.getMonthlyIncomeTotalForDisplay).mockResolvedValue(50000)

    const { result } = renderHook(() => useDashboardIncomes('user-1', ym, false))

    await waitFor(() => {
      expect(result.current.monthlyLoading).toBe(false)
    })

    expect(incomeService.getMonthlyIncomeTotalForDisplay).toHaveBeenCalledWith(
      'user-1',
      2026,
      3
    )
    expect(incomeService.getIncomesInMonth).not.toHaveBeenCalled()
    expect(result.current.monthlyTotal).toBe(50000)
    expect(result.current.incomes).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('loads list when enabled', async () => {
    const list = [makeIncome('a', 100), makeIncome('b', 200)]
    vi.mocked(incomeService.getMonthlyIncomeTotalForDisplay).mockResolvedValue(300)
    vi.mocked(incomeService.getIncomesInMonth).mockResolvedValue(list)

    const { result } = renderHook(() => useDashboardIncomes('user-1', ym, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.monthlyLoading).toBe(false)
    })

    expect(incomeService.getIncomesInMonth).toHaveBeenCalledWith('user-1', 2026, 3)
    expect(result.current.monthIncomeCount).toBe(2)
    expect(result.current.incomes).toHaveLength(2)
    expect(result.current.monthlyTotal).toBe(300)
  })

  it('pages client-side when list has more than page size', async () => {
    const list = Array.from({ length: 12 }, (_, i) => makeIncome(`id-${i}`, i + 1))
    vi.mocked(incomeService.getIncomesInMonth).mockResolvedValue(list)
    vi.mocked(incomeService.getMonthlyIncomeTotalForDisplay).mockResolvedValue(78)

    const { result } = renderHook(() => useDashboardIncomes('user-1', ym, true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.incomes).toHaveLength(DASHBOARD_INCOME_PAGE_SIZE)
    expect(result.current.totalPages).toBe(2)

    act(() => {
      result.current.goToPage(2)
    })

    expect(result.current.incomes).toHaveLength(2)
    expect(result.current.currentPage).toBe(2)
  })

  it('does not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useDashboardIncomes(undefined, ym, true))

    await waitFor(() => {
      expect(result.current.monthlyLoading).toBe(false)
    })

    expect(incomeService.getMonthlyIncomeTotalForDisplay).not.toHaveBeenCalled()
    expect(incomeService.getIncomesInMonth).not.toHaveBeenCalled()
  })

  it('sets error when list fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(incomeService.getIncomesInMonth).mockRejectedValue(new Error('index required'))

      const { result } = renderHook(() => useDashboardIncomes('user-1', ym, true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error?.message).toBe('index required')
      expect(result.current.incomes).toEqual([])
    } finally {
      consoleError.mockRestore()
    }
  })
})
