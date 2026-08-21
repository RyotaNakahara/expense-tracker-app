import { useEffect, useState } from 'react'
import { listTotalBudgetLimitsForYear } from '../services/budgetService'
import { expenseService } from '../services/expenseService'
import {
  buildYearMonthBudgetSpent,
  computeCarryoverChain,
  type MonthCarryover,
} from '../utils/budgetCarryover'

/**
 * 指定月の全体予算について、前月までの繰越を加味した有効予算を算出する。
 * - 全体予算のみ取得（カテゴリー／タグ別は読まない）
 * - 当年の実績は選択月まで
 * - 前年は年初からのチェーンに必要な12か月
 */
export function useMonthBudgetCarryover(
  userId: string | undefined,
  year: number,
  month: number
): {
  carryover: MonthCarryover | null
  loading: boolean
  error: Error | null
} {
  const [carryover, setCarryover] = useState<MonthCarryover | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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
        const [prevBudgetMap, curBudgetMap, prevSpent, curSpent] = await Promise.all([
          listTotalBudgetLimitsForYear(userId, year - 1),
          listTotalBudgetLimitsForYear(userId, year),
          expenseService.getSpentByMonthForYear(userId, year - 1, 12),
          expenseService.getSpentByMonthForYear(userId, year, month),
        ])
        if (cancelled) return

        const prevChain = computeCarryoverChain(
          buildYearMonthBudgetSpent(year - 1, prevBudgetMap, prevSpent),
          0
        )
        const initialCarryIn = prevChain[11]?.carryOut ?? 0
        const curChain = computeCarryoverChain(
          buildYearMonthBudgetSpent(year, curBudgetMap, curSpent),
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
  }, [userId, year, month])

  return { carryover, loading, error }
}
