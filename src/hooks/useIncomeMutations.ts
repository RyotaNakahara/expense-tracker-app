import { useCallback } from 'react'
import { incomeService } from '../services/incomeService'
import type { CreateIncomeInput, UpdateIncomeInput } from '../types'

export const useIncomeMutations = (userId: string | undefined) => {
  const createIncome = useCallback(
    async (input: CreateIncomeInput): Promise<string> => {
      if (!userId) {
        throw new Error('User ID is required')
      }
      return incomeService.createIncome(userId, input)
    },
    [userId]
  )

  const updateIncome = useCallback(async (incomeId: string, input: UpdateIncomeInput): Promise<void> => {
    await incomeService.updateIncome(incomeId, input)
  }, [])

  const deleteIncome = useCallback(async (incomeId: string): Promise<void> => {
    await incomeService.deleteIncome(incomeId)
  }, [])

  return {
    createIncome,
    updateIncome,
    deleteIncome,
  }
}
