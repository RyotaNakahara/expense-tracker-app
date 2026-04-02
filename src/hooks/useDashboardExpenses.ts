import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { expenseService } from '../services/expenseService'
import type { Expense } from '../types'

export const DASHBOARD_EXPENSE_PAGE_SIZE = 10

export type DashboardYearMonth = { year: number; month: number }

export function getCurrentYearMonth(): DashboardYearMonth {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function sumAmounts(list: Expense[]): number {
  return list.reduce((s, e) => s + (e.amount || 0), 0)
}

/**
 * ダッシュボードは選択した暦月の支出を表示。
 * 1) 月範囲クエリ（インデックス要）→ 失敗時 2) userId のみの取得（インデックス不要）＋クライアントでその月に絞る。
 * 合計は一覧と同じデータから算出（monthlyTotals ドキュメントに依存しない）。
 */
export const useDashboardExpenses = (userId: string | undefined) => {
  const [yearMonth, setYearMonth] = useState<DashboardYearMonth>(getCurrentYearMonth)
  const prevUserIdRef = useRef<string | undefined>(undefined)

  useLayoutEffect(() => {
    if (userId) {
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        setYearMonth(getCurrentYearMonth())
      }
      prevUserIdRef.current = userId
    } else {
      prevUserIdRef.current = undefined
    }
  }, [userId])

  const setSelectedYearMonth = useCallback((year: number, month: number) => {
    setYearMonth({ year, month })
  }, [])

  const [expenses, setExpenses] = useState<Expense[]>([])
  /** 選択月分の全件（ページ分割の元） */
  const [monthExpensesAll, setMonthExpensesAll] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<Error | null>(null)

  const applyClientPage = useCallback((full: Expense[], page: number) => {
    const start = (page - 1) * DASHBOARD_EXPENSE_PAGE_SIZE
    setExpenses(full.slice(start, start + DASHBOARD_EXPENSE_PAGE_SIZE))
    setCurrentPage(page)
    setTotalPages(Math.max(1, Math.ceil(full.length / DASHBOARD_EXPENSE_PAGE_SIZE)))
  }, [])

  const loadDashboardMonthData = useCallback(
    async (opts?: { cancelled?: () => boolean }) => {
      if (!userId) return
      const cancelled = opts?.cancelled ?? (() => false)
      const { year, month } = yearMonth

      let list: Expense[] = []
      try {
        list = await expenseService.getExpensesInMonth(userId, year, month)
        if (cancelled()) return
      } catch (firstErr) {
        console.warn('getExpensesInMonth failed, using userId-only fallback', firstErr)
        try {
          const all = await expenseService.getExpensesByUserId(userId)
          if (cancelled()) return
          list = expenseService.filterExpensesInCalendarMonth(all, year, month)
        } catch (secondErr) {
          if (!cancelled()) {
            console.error(secondErr)
            setError(secondErr as Error)
            setMonthExpensesAll([])
            setExpenses([])
            setMonthlyTotal(0)
            setTotalPages(1)
            setCurrentPage(1)
          }
          return
        }
      }

      if (cancelled()) return
      setMonthExpensesAll(list)
      setMonthlyTotal(sumAmounts(list))
      applyClientPage(list, 1)
      setError(null)
    },
    [userId, yearMonth, applyClientPage]
  )

  const goToPage = useCallback(
    (target: number) => {
      if (monthExpensesAll.length === 0) {
        if (target === 1) applyClientPage([], 1)
        return
      }
      const maxPage = Math.max(1, Math.ceil(monthExpensesAll.length / DASHBOARD_EXPENSE_PAGE_SIZE))
      const page = Math.min(Math.max(1, target), maxPage)
      applyClientPage(monthExpensesAll, page)
    },
    [monthExpensesAll, applyClientPage]
  )

  const refreshAfterMutation = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      await loadDashboardMonthData()
    } finally {
      setLoading(false)
    }
  }, [userId, loadDashboardMonthData])

  useEffect(() => {
    if (!userId) {
      setMonthExpensesAll([])
      setExpenses([])
      setMonthlyTotal(0)
      setLoading(false)
      setCurrentPage(1)
      setTotalPages(1)
      setError(null)
      return
    }

    let cancelled = false
    const isCancelled = () => cancelled

    setLoading(true)
    setError(null)

    void loadDashboardMonthData({ cancelled: isCancelled }).finally(() => {
      if (!isCancelled()) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, yearMonth, loadDashboardMonthData])

  return {
    expenses,
    loading,
    monthlyTotal,
    /** 合計カードも一覧と同じロードに揃える */
    monthlyLoading: loading,
    currentPage,
    totalPages,
    goToPage,
    refreshAfterMutation,
    error,
    /** 選択月に取得した支出の件数（ページング前の全件） */
    monthExpenseCount: monthExpensesAll.length,
    selectedYearMonth: yearMonth,
    setSelectedYearMonth,
  }
}
