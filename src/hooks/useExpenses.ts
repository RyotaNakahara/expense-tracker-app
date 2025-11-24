import { useState, useEffect } from 'react'
import { expenseService } from '../services/expenseService'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../types'

export const useExpenses = (userId: string | undefined) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!userId) {
        setExpenses([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await expenseService.getExpensesByUserId(userId)
        setExpenses(data)
      } catch (e) {
        console.error('Failed to load expenses', e)
        setError(e as Error)
        setExpenses([])
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [userId])

  const refreshExpenses = async () => {
    if (!userId) return

    try {
      const data = await expenseService.getExpensesByUserId(userId)
      setExpenses(data)
      setError(null)
    } catch (e) {
      console.error('Failed to refresh expenses', e)
      setError(e as Error)
    }
  }

  // 支出を作成
  const createExpense = async (input: CreateExpenseInput): Promise<string | null> => {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      const expenseId = await expenseService.createExpense(userId, input)
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
      await expenseService.updateExpense(expenseId, input)
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
      await expenseService.deleteExpense(expenseId)
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

