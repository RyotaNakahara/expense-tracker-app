import { useState, useEffect, useCallback } from 'react'
import { expenseService } from '../services/expenseService'
import { useExpenseMutations } from './useExpenseMutations'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../types'

export type UseExpensesOptions = {
  /** 指定時はその月だけ取得（読取抑制） */
  year?: number | null
  month?: number | null
  /**
   * year/month 未指定時: 全期間の代わりに直近 N か月のみ（サマリー用）。
   * 未指定なら従来どおり全件。
   */
  recentMonths?: number
}

export const useExpenses = (userId: string | undefined, options?: UseExpensesOptions) => {
  const { createExpense: createExpenseDoc, updateExpense: updateExpenseDoc, deleteExpense: deleteExpenseDoc } =
    useExpenseMutations(userId)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const year = options?.year ?? null
  const month = options?.month ?? null
  const recentMonths = options?.recentMonths

  const loadExpensesFromServer = useCallback(
    async (loadOpts: { withLoadingSpinner: boolean }) => {
      if (!userId) {
        setExpenses([])
        setError(null)
        setLoading(false)
        return
      }

      if (loadOpts.withLoadingSpinner) {
        setLoading(true)
      }
      try {
        setError(null)
        let data: Expense[]
        if (year != null && month != null) {
          data = await expenseService.getExpensesInMonth(userId, year, month)
        } else if (recentMonths != null && recentMonths > 0) {
          data = await expenseService.getExpensesForRecentMonths(userId, recentMonths)
        } else {
          data = await expenseService.getExpensesByUserId(userId)
        }
        setExpenses(data)
      } catch (e) {
        console.error('Failed to load expenses', e)
        setError(e as Error)
        setExpenses([])
      } finally {
        if (loadOpts.withLoadingSpinner) {
          setLoading(false)
        }
      }
    },
    [userId, year, month, recentMonths]
  )

  useEffect(() => {
    void loadExpensesFromServer({ withLoadingSpinner: true })
  }, [loadExpensesFromServer])

  const refreshExpenses = async () => {
    if (!userId) return
    await loadExpensesFromServer({ withLoadingSpinner: false })
  }

  const createExpense = async (input: CreateExpenseInput): Promise<string | null> => {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      const expenseId = await createExpenseDoc(input)
      await refreshExpenses()
      return expenseId
    } catch (e) {
      console.error('Failed to create expense', e)
      setError(e as Error)
      throw e
    }
  }

  const updateExpense = async (expenseId: string, input: UpdateExpenseInput): Promise<void> => {
    try {
      await updateExpenseDoc(expenseId, input)
      await refreshExpenses()
    } catch (e) {
      console.error('Failed to update expense', e)
      setError(e as Error)
      throw e
    }
  }

  const deleteExpense = async (expenseId: string): Promise<void> => {
    try {
      await deleteExpenseDoc(expenseId)
      await refreshExpenses()
    } catch (e) {
      console.error('Failed to delete expense', e)
      setError(e as Error)
      throw e
    }
  }

  return {
    expenses,
    loading,
    error,
    refreshExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  }
}
