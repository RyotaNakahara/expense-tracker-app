import { useCallback } from 'react'
import { expenseService } from '../services/expenseService'
import type { CreateExpenseInput, UpdateExpenseInput } from '../types'

/** 一覧取得を伴わない支出の作成・更新・削除（ダッシュボード等で利用） */
export const useExpenseMutations = (userId: string | undefined) => {
  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<string> => {
      if (!userId) {
        throw new Error('User ID is required')
      }
      return expenseService.createExpense(userId, input)
    },
    [userId]
  )

  const updateExpense = useCallback(async (expenseId: string, input: UpdateExpenseInput): Promise<void> => {
    await expenseService.updateExpense(expenseId, input)
  }, [])

  const deleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    await expenseService.deleteExpense(expenseId)
  }, [])

  return {
    createExpense,
    updateExpense,
    deleteExpense,
  }
}
