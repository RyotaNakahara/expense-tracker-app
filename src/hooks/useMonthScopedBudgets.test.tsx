import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { useMonthScopedBudgets } from './useMonthScopedBudgets'
import { listBudgetsForMonth } from '../services/budgetService'
import type { MonthlyBudget } from '../types'

vi.mock('../services/budgetService', () => ({
  listBudgetsForMonth: vi.fn(),
}))

const ts = Timestamp.now()

function budget(partial: Partial<MonthlyBudget> & Pick<MonthlyBudget, 'id'>): MonthlyBudget {
  return {
    userId: 'u1',
    year: 2026,
    month: 4,
    amountLimit: 1000,
    categoryId: null,
    categoryName: null,
    tagId: null,
    tagName: null,
    updatedAt: ts,
    ...partial,
  }
}

describe('useMonthScopedBudgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears when userId is undefined', async () => {
    const { result } = renderHook(() => useMonthScopedBudgets(undefined, 2026, 4))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listBudgetsForMonth).not.toHaveBeenCalled()
    expect(result.current.categoryBudgets).toEqual([])
    expect(result.current.tagBudgets).toEqual([])
  })

  it('splits category and tag budgets and excludes totals', async () => {
    vi.mocked(listBudgetsForMonth).mockResolvedValue([
      budget({ id: 'total', amountLimit: 50000 }),
      budget({
        id: 'cat',
        categoryId: 'c1',
        categoryName: '食費',
        amountLimit: 10000,
      }),
      budget({
        id: 'tag',
        tagId: 't1',
        tagName: 'ランチ',
        amountLimit: 3000,
      }),
    ])

    const { result } = renderHook(() => useMonthScopedBudgets('user-1', 2026, 4))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listBudgetsForMonth).toHaveBeenCalledWith('user-1', 2026, 4)
    expect(result.current.categoryBudgets).toHaveLength(1)
    expect(result.current.categoryBudgets[0].categoryName).toBe('食費')
    expect(result.current.tagBudgets).toHaveLength(1)
    expect(result.current.tagBudgets[0].tagName).toBe('ランチ')
  })

  it('sets error on failure', async () => {
    vi.mocked(listBudgetsForMonth).mockRejectedValue(new Error('denied'))

    const { result } = renderHook(() => useMonthScopedBudgets('user-1', 2026, 4))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error?.message).toBe('denied')
    expect(result.current.categoryBudgets).toEqual([])
  })
})
