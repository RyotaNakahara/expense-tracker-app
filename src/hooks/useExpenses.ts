import { useState, useEffect } from 'react'
import { expenseService } from '../services/expenseService'
import type { Expense } from '../types'

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

  return { expenses, loading, error, refreshExpenses }
}

