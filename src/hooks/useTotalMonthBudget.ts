import { useEffect, useState } from 'react'
import { getMonthlyTotalBudget } from '../services/budgetService'
import type { MonthlyBudget } from '../types'

/**
 * 月次「全体」予算を one-shot 取得（ダッシュボード用。realtime は使わない）。
 */
export function useTotalMonthBudget(
  userId: string | undefined,
  year: number,
  month: number
): { totalBudget: MonthlyBudget | null; loading: boolean; error: Error | null } {
  const [totalBudget, setTotalBudget] = useState<MonthlyBudget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setTotalBudget(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void getMonthlyTotalBudget(userId, year, month)
      .then((b) => {
        if (!cancelled) setTotalBudget(b)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setTotalBudget(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, year, month])

  return { totalBudget, loading, error }
}
