import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useIncomeCategories } from './useIncomeCategories'
import { incomeCategoryService } from '../services/incomeCategoryService'
import type { Category } from '../types'

vi.mock('../services/incomeCategoryService', () => ({
  incomeCategoryService: {
    getAllCategories: vi.fn(),
  },
}))

const cats: Category[] = [
  {
    id: '1',
    name: '給与',
    order: 0,
  },
]

describe('useIncomeCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(incomeCategoryService.getAllCategories).mockResolvedValue(cats)
  })

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useIncomeCategories({ enabled: false }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(incomeCategoryService.getAllCategories).not.toHaveBeenCalled()
    expect(result.current.categories).toEqual([])
  })

  it('fetches when enabled', async () => {
    const { result } = renderHook(() => useIncomeCategories({ enabled: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(incomeCategoryService.getAllCategories).toHaveBeenCalled()
    expect(result.current.categories).toEqual(cats)
  })

  it('fetches by default when options omitted', async () => {
    const { result } = renderHook(() => useIncomeCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(incomeCategoryService.getAllCategories).toHaveBeenCalled()
  })

  it('refreshCategories reloads data', async () => {
    const { result } = renderHook(() => useIncomeCategories({ enabled: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.mocked(incomeCategoryService.getAllCategories).mockResolvedValue([
      ...cats,
      {
        id: '2',
        name: 'ボーナス',
        order: 1,
      },
    ])

    await act(async () => {
      await result.current.refreshCategories()
    })

    expect(result.current.categories).toHaveLength(2)
  })
})
