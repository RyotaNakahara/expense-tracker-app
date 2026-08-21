import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { expenseService } from '../services/expenseService'
import type { Expense } from '../types'

export const DASHBOARD_EXPENSE_PAGE_SIZE = 10

export type DashboardYearMonth = { year: number; month: number }

export function getCurrentYearMonth(): DashboardYearMonth {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/**
 * ダッシュボードは選択した暦月の支出を表示。
 * 合計は monthlyTotals、一覧はサーバーページング、件数は count 集計。
 * 月全件はカテゴリー／タグ予算突合が必要なときだけ読み取る。
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
  const [monthExpensesAll, setMonthExpensesAll] = useState<Expense[]>([])
  const [monthExpensesAllLoading, setMonthExpensesAllLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [monthExpenseCount, setMonthExpenseCount] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const pageDataRef = useRef<Map<number, Expense[]>>(new Map())
  /** page N の末尾ドキュメント（page N+1 の startAfter 用） */
  const lastDocByPageRef = useRef<Map<number, QueryDocumentSnapshot<DocumentData>>>(new Map())
  const allLoadedForKeyRef = useRef<string | null>(null)

  const yearMonthKey = `${yearMonth.year}_${yearMonth.month}`

  const resetPaging = useCallback(() => {
    pageDataRef.current = new Map()
    lastDocByPageRef.current = new Map()
    setMonthExpensesAll([])
    allLoadedForKeyRef.current = null
  }, [])

  const loadInitial = useCallback(
    async (opts?: { cancelled?: () => boolean }) => {
      if (!userId) return
      const cancelled = opts?.cancelled ?? (() => false)
      const { year, month } = yearMonth

      try {
        const [total, count, pageResult] = await Promise.all([
          expenseService.getMonthlyTotalForDisplay(userId, year, month),
          expenseService.getExpenseCountInMonth(userId, year, month),
          expenseService.getExpensesPageForMonth(
            userId,
            year,
            month,
            DASHBOARD_EXPENSE_PAGE_SIZE
          ),
        ])
        if (cancelled()) return

        resetPaging()
        pageDataRef.current.set(1, pageResult.expenses)
        if (pageResult.lastDoc) {
          lastDocByPageRef.current.set(1, pageResult.lastDoc)
        }

        setMonthlyTotal(total)
        setMonthExpenseCount(count)
        setTotalPages(Math.max(1, Math.ceil(count / DASHBOARD_EXPENSE_PAGE_SIZE)))
        setCurrentPage(1)
        setExpenses(pageResult.expenses)
        setError(null)
      } catch (err) {
        console.error('dashboard expense load failed (no broad-fetch fallback)', err)
        if (!cancelled()) {
          setError(err as Error)
          resetPaging()
          setExpenses([])
          setMonthlyTotal(0)
          setMonthExpenseCount(0)
          setTotalPages(1)
          setCurrentPage(1)
        }
      }
    },
    [userId, yearMonth, resetPaging]
  )

  const goToPage = useCallback(
    async (target: number) => {
      if (!userId) return
      const maxPage = Math.max(1, Math.ceil(monthExpenseCount / DASHBOARD_EXPENSE_PAGE_SIZE))
      const page = Math.min(Math.max(1, target), maxPage)

      if (pageDataRef.current.has(page)) {
        setExpenses(pageDataRef.current.get(page)!)
        setCurrentPage(page)
        return
      }

      const { year, month } = yearMonth
      let walk = 1
      while (walk < page) {
        if (!pageDataRef.current.has(walk + 1)) {
          const startAfterDoc = lastDocByPageRef.current.get(walk)
          if (!startAfterDoc) break
          const result = await expenseService.getExpensesPageForMonth(
            userId,
            year,
            month,
            DASHBOARD_EXPENSE_PAGE_SIZE,
            startAfterDoc
          )
          pageDataRef.current.set(walk + 1, result.expenses)
          if (result.lastDoc) {
            lastDocByPageRef.current.set(walk + 1, result.lastDoc)
          }
          if (!result.hasMore) break
        }
        walk += 1
      }

      if (pageDataRef.current.has(page)) {
        setExpenses(pageDataRef.current.get(page)!)
        setCurrentPage(page)
      }
    },
    [userId, yearMonth, monthExpenseCount]
  )

  /** カテゴリー／タグ予算の実績突合用。必要なときだけ月全件を読む */
  const ensureMonthExpensesAll = useCallback(async () => {
    if (!userId) return []
    if (allLoadedForKeyRef.current === yearMonthKey) {
      return monthExpensesAll
    }

    setMonthExpensesAllLoading(true)
    try {
      const list = await expenseService.getExpensesInMonth(
        userId,
        yearMonth.year,
        yearMonth.month
      )
      allLoadedForKeyRef.current = yearMonthKey
      setMonthExpensesAll(list)
      return list
    } finally {
      setMonthExpensesAllLoading(false)
    }
  }, [userId, yearMonth, yearMonthKey, monthExpensesAll])

  const refreshAfterMutation = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setMonthlyLoading(true)
    try {
      await loadInitial()
    } finally {
      setLoading(false)
      setMonthlyLoading(false)
    }
  }, [userId, loadInitial])

  useEffect(() => {
    if (!userId) {
      resetPaging()
      setExpenses([])
      setMonthlyTotal(0)
      setMonthExpenseCount(0)
      setLoading(false)
      setMonthlyLoading(false)
      setCurrentPage(1)
      setTotalPages(1)
      setError(null)
      return
    }

    let cancelled = false
    const isCancelled = () => cancelled

    setLoading(true)
    setMonthlyLoading(true)
    setError(null)

    void loadInitial({ cancelled: isCancelled }).finally(() => {
      if (!isCancelled()) {
        setLoading(false)
        setMonthlyLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId, yearMonth, loadInitial, resetPaging])

  return {
    expenses,
    monthExpensesAll,
    monthExpensesAllLoading,
    ensureMonthExpensesAll,
    loading,
    monthlyTotal,
    monthlyLoading,
    currentPage,
    totalPages,
    goToPage,
    refreshAfterMutation,
    error,
    monthExpenseCount,
    selectedYearMonth: yearMonth,
    setSelectedYearMonth,
  }
}
