import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMonthBudgetCarryover } from './useMonthBudgetCarryover'
import { listTotalBudgetLimitsForYear } from '../services/budgetService'
import { expenseService } from '../services/expenseService'
import { incomeService } from '../services/incomeService'

vi.mock('../services/budgetService', () => ({
  listTotalBudgetLimitsForYear: vi.fn(),
}))

vi.mock('../services/expenseService', () => ({
  expenseService: {
    getSpentByMonthForYear: vi.fn(),
  },
}))

vi.mock('../services/incomeService', () => ({
  incomeService: {
    getIncomeByMonthForYear: vi.fn(),
  },
}))

function emptyBudgetMap(): Record<number, number | null> {
  const m: Record<number, number | null> = {}
  for (let i = 1; i <= 12; i++) m[i] = null
  return m
}

function emptyAmountMap(): Record<number, number> {
  const m: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) m[i] = 0
  return m
}

describe('useMonthBudgetCarryover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(incomeService.getIncomeByMonthForYear).mockResolvedValue(emptyAmountMap())
  })

  it('does nothing when userId is undefined', async () => {
    const { result } = renderHook(() => useMonthBudgetCarryover(undefined, 2026, 3))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listTotalBudgetLimitsForYear).not.toHaveBeenCalled()
    expect(result.current.carryover).toBeNull()
  })

  it('computes carryIn including income in available budget', async () => {
    const prevBudgets = emptyBudgetMap()
    prevBudgets[12] = 100_000
    const prevSpent = emptyAmountMap()
    prevSpent[12] = 40_000
    const prevIncome = emptyAmountMap()
    prevIncome[12] = 10_000

    const curBudgets = emptyBudgetMap()
    curBudgets[1] = 100_000
    curBudgets[2] = 100_000
    curBudgets[3] = 100_000
    const curSpent = emptyAmountMap()
    curSpent[3] = 10_000
    const curIncome = emptyAmountMap()
    curIncome[3] = 5_000

    vi.mocked(listTotalBudgetLimitsForYear)
      .mockResolvedValueOnce(prevBudgets)
      .mockResolvedValueOnce(curBudgets)
    vi.mocked(expenseService.getSpentByMonthForYear)
      .mockResolvedValueOnce(prevSpent)
      .mockResolvedValueOnce(curSpent)
    vi.mocked(incomeService.getIncomeByMonthForYear)
      .mockResolvedValueOnce(prevIncome)
      .mockResolvedValueOnce(curIncome)

    const { result } = renderHook(() => useMonthBudgetCarryover('user-1', 2026, 3))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(incomeService.getIncomeByMonthForYear).toHaveBeenCalledWith('user-1', 2025, 12)
    expect(incomeService.getIncomeByMonthForYear).toHaveBeenCalledWith('user-1', 2026, 3)

    // prev Dec: 100k + 10k income - 40k = 70k carryOut
    // Jan: 100k+70k = 170k; Feb: 100k+170k = 270k carry to Mar
    expect(result.current.carryover).toMatchObject({
      year: 2026,
      month: 3,
      budgetLimit: 100_000,
      spent: 10_000,
      income: 5_000,
      carryIn: 270_000,
      available: 375_000,
    })
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    vi.mocked(listTotalBudgetLimitsForYear).mockRejectedValue(new Error('network'))

    const { result } = renderHook(() => useMonthBudgetCarryover('user-1', 2026, 1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error?.message).toBe('network')
    expect(result.current.carryover).toBeNull()
  })
})
