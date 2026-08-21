import { useState, useEffect, useCallback } from 'react'
import { incomeService } from '../services/incomeService'
import type { DashboardYearMonth } from './useDashboardExpenses'
import type { Income } from '../types'

export const DASHBOARD_INCOME_PAGE_SIZE = 10

/**
 * ダッシュボード用収入。
 * - 合計は常に monthlyIncomeTotals（1 read）
 * - 一覧は enabled のときだけ月全件（トグルで開いたとき）
 */
export const useDashboardIncomes = (
  userId: string | undefined,
  yearMonth: DashboardYearMonth,
  enabled = true
) => {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [monthIncomesAll, setMonthIncomesAll] = useState<Income[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<Error | null>(null)

  const applyClientPage = useCallback((full: Income[], page: number) => {
    const start = (page - 1) * DASHBOARD_INCOME_PAGE_SIZE
    setIncomes(full.slice(start, start + DASHBOARD_INCOME_PAGE_SIZE))
    setCurrentPage(page)
    setTotalPages(Math.max(1, Math.ceil(full.length / DASHBOARD_INCOME_PAGE_SIZE)))
  }, [])

  const loadTotal = useCallback(
    async (opts?: { cancelled?: () => boolean }) => {
      if (!userId) return
      const cancelled = opts?.cancelled ?? (() => false)
      const { year, month } = yearMonth
      try {
        const total = await incomeService.getMonthlyIncomeTotalForDisplay(userId, year, month)
        if (cancelled()) return
        setMonthlyTotal(total)
      } catch (err) {
        console.error('getMonthlyIncomeTotalForDisplay failed', err)
        if (!cancelled()) setMonthlyTotal(0)
      }
    },
    [userId, yearMonth]
  )

  const loadList = useCallback(
    async (opts?: { cancelled?: () => boolean }) => {
      if (!userId || !enabled) return
      const cancelled = opts?.cancelled ?? (() => false)
      const { year, month } = yearMonth

      try {
        const list = await incomeService.getIncomesInMonth(userId, year, month)
        if (cancelled()) return
        setMonthIncomesAll(list)
        applyClientPage(list, 1)
        setError(null)
      } catch (err) {
        console.error('getIncomesInMonth failed', err)
        if (!cancelled()) {
          setError(err as Error)
          setMonthIncomesAll([])
          setIncomes([])
          setTotalPages(1)
          setCurrentPage(1)
        }
      }
    },
    [userId, yearMonth, enabled, applyClientPage]
  )

  const goToPage = useCallback(
    (target: number) => {
      if (monthIncomesAll.length === 0) {
        if (target === 1) applyClientPage([], 1)
        return
      }
      const maxPage = Math.max(1, Math.ceil(monthIncomesAll.length / DASHBOARD_INCOME_PAGE_SIZE))
      const page = Math.min(Math.max(1, target), maxPage)
      applyClientPage(monthIncomesAll, page)
    },
    [monthIncomesAll, applyClientPage]
  )

  const refreshAfterMutation = useCallback(async () => {
    if (!userId) return
    setMonthlyLoading(true)
    if (enabled) setListLoading(true)
    try {
      await loadTotal()
      if (enabled) await loadList()
      else {
        // 合計だけ更新済み。一覧は閉じていれば次に開いたときに再取得
        setMonthIncomesAll([])
        setIncomes([])
      }
    } finally {
      setMonthlyLoading(false)
      setListLoading(false)
    }
  }, [userId, enabled, loadTotal, loadList])

  useEffect(() => {
    if (!userId) {
      setMonthlyTotal(0)
      setMonthlyLoading(false)
      return
    }
    let cancelled = false
    setMonthlyLoading(true)
    void loadTotal({ cancelled: () => cancelled }).finally(() => {
      if (!cancelled) setMonthlyLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, yearMonth, loadTotal])

  useEffect(() => {
    if (!userId || !enabled) {
      setMonthIncomesAll([])
      setIncomes([])
      setListLoading(false)
      setCurrentPage(1)
      setTotalPages(1)
      setError(null)
      return
    }

    let cancelled = false
    setListLoading(true)
    setError(null)
    void loadList({ cancelled: () => cancelled }).finally(() => {
      if (!cancelled) setListLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, yearMonth, enabled, loadList])

  return {
    incomes,
    monthIncomesAll,
    loading: listLoading,
    monthlyTotal,
    monthlyLoading,
    currentPage,
    totalPages,
    goToPage,
    refreshAfterMutation,
    error,
    monthIncomeCount: monthIncomesAll.length,
  }
}
