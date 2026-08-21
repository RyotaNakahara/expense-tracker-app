import { useEffect, useState } from 'react'
import { listBudgetsForMonth } from '../services/budgetService'
import type { MonthlyBudget } from '../types'

/**
 * 指定月のカテゴリー別・タグ別予算のみ取得（全体予算は含めない）。
 */
export function useMonthScopedBudgets(
  userId: string | undefined,
  year: number,
  month: number
): {
  categoryBudgets: MonthlyBudget[]
  tagBudgets: MonthlyBudget[]
  loading: boolean
  error: Error | null
} {
  const [categoryBudgets, setCategoryBudgets] = useState<MonthlyBudget[]>([])
  const [tagBudgets, setTagBudgets] = useState<MonthlyBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setCategoryBudgets([])
      setTagBudgets([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await listBudgetsForMonth(userId, year, month)
        if (cancelled) return
        setCategoryBudgets(list.filter((b) => b.categoryId && !b.tagId))
        setTagBudgets(list.filter((b) => Boolean(b.tagId)))
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setCategoryBudgets([])
          setTagBudgets([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, year, month])

  return { categoryBudgets, tagBudgets, loading, error }
}
