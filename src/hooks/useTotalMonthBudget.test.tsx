import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { useTotalMonthBudget } from './useTotalMonthBudget'
import { getMonthlyTotalBudget } from '../services/budgetService'
import type { MonthlyBudget } from '../types'

vi.mock('../services/budgetService', () => ({
  getMonthlyTotalBudget: vi.fn(),
}))

describe('useTotalMonthBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null without fetching when userId is undefined', async () => {
    const { result } = renderHook(() => useTotalMonthBudget(undefined, 2026, 3))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(getMonthlyTotalBudget).not.toHaveBeenCalled()
    expect(result.current.totalBudget).toBeNull()
  })

  it('loads total budget document', async () => {
    const budget: MonthlyBudget = {
      id: '2026_03',
      userId: 'u1',
      year: 2026,
      month: 3,
      amountLimit: 120000,
      categoryId: null,
      categoryName: null,
      tagId: null,
      tagName: null,
      updatedAt: Timestamp.now(),
    }
    vi.mocked(getMonthlyTotalBudget).mockResolvedValue(budget)

    const { result } = renderHook(() => useTotalMonthBudget('u1', 2026, 3))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(getMonthlyTotalBudget).toHaveBeenCalledWith('u1', 2026, 3)
    expect(result.current.totalBudget?.amountLimit).toBe(120000)
  })

  it('sets error when get fails', async () => {
    vi.mocked(getMonthlyTotalBudget).mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useTotalMonthBudget('u1', 2026, 3))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error?.message).toBe('offline')
    expect(result.current.totalBudget).toBeNull()
  })
})
