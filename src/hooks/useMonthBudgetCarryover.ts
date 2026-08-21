import { useCallback, useEffect, useState } from 'react'
import { listTotalBudgetLimitsForYear } from '../services/budgetService'
import { expenseService } from '../services/expenseService'
import { incomeService } from '../services/incomeService'
import {
  buildYearMonthBudgetSpent,
  computeCarryoverChain,
  type MonthCarryover,
} from '../utils/budgetCarryover'

/**
 * 指定月の全体予算について、前月までの繰越を加味した有効予算を算出する。
 * 収入は有効予算に加算する（予算 + 繰入 + 収入 − 実績）。
 */
export function useMonthBudgetCarryover(
  userId: string | undefined,
  year: number,
  month: number
): {
  carryover: MonthCarryover | null
  loading: boolean
  error: Error | null
  refresh: () => void
} {
  const [carryover, setCarryover] = useState<MonthCarryover | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!userId) {
      setCarryover(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [prevBudgetMap, curBudgetMap, prevSpent, curSpent, prevIncome, curIncome] =
          await Promise.all([
            listTotalBudgetLimitsForYear(userId, year - 1),
            listTotalBudgetLimitsForYear(userId, year),
            expenseService.getSpentByMonthForYear(userId, year - 1, 12),
            expenseService.getSpentByMonthForYear(userId, year, month),
            incomeService.getIncomeByMonthForYear(userId, year - 1, 12),
            incomeService.getIncomeByMonthForYear(userId, year, month),
          ])
        if (cancelled) return

        const prevChain = computeCarryoverChain(
          buildYearMonthBudgetSpent(year - 1, prevBudgetMap, prevSpent, prevIncome),
          0
        )
        const initialCarryIn = prevChain[11]?.carryOut ?? 0
        const curChain = computeCarryoverChain(
          buildYearMonthBudgetSpent(year, curBudgetMap, curSpent, curIncome),
          initialCarryIn
        )
        const row = curChain.find((r) => r.month === month) ?? null
        setCarryover(row)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setCarryover(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, year, month, refreshTick])

  return { carryover, loading, error, refresh }
}
