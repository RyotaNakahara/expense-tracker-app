import { useState, useEffect, useCallback } from 'react'
import { expenseService } from '../services/expenseService'
import { useExpenseMutations } from './useExpenseMutations'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../types'

export const useExpenses = (userId: string | undefined) => {
  const { createExpense: createExpenseDoc, updateExpense: updateExpenseDoc, deleteExpense: deleteExpenseDoc } =
    useExpenseMutations(userId)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadExpensesFromServer = useCallback(
    async (options: { withLoadingSpinner: boolean }) => {
      if (!userId) {
        setExpenses([])
        setError(null)
        setLoading(false)
        return
      }

      if (options.withLoadingSpinner) {
        setLoading(true)
      }
      try {
        setError(null)
        const data = await expenseService.getExpensesByUserId(userId)
        setExpenses(data)
      } catch (e) {
        console.error('Failed to load expenses', e)
        setError(e as Error)
        setExpenses([])
      } finally {
        if (options.withLoadingSpinner) {
          setLoading(false)
        }
      }
    },
    [userId]
  )

  useEffect(() => {
    void loadExpensesFromServer({ withLoadingSpinner: true })
  }, [loadExpensesFromServer])

  const refreshExpenses = async () => {
    if (!userId) return
    await loadExpensesFromServer({ withLoadingSpinner: false })
  }

  // 支出を作成
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

  // 支出を更新
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

  // 支出を削除
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

