import { useState, useEffect, useCallback } from 'react'
import { incomeCategoryService } from '../services/incomeCategoryService'
import type { Category } from '../types'

export type UseIncomeCategoriesOptions = {
  /** false のときは取得しない（管理画面の折りたたみ用） */
  enabled?: boolean
}

export const useIncomeCategories = (options?: UseIncomeCategoriesOptions) => {
  const enabled = options?.enabled !== false
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  const refreshCategories = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await incomeCategoryService.getAllCategories()
      setCategories(data)
      setError(null)
    } catch (e) {
      console.error('Failed to refresh income categories', e)
      setError(e as Error)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCategories([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await incomeCategoryService.getAllCategories()
        if (!cancelled) setCategories(data)
      } catch (e) {
        console.error('Failed to load income categories', e)
        if (!cancelled) {
          setError(e as Error)
          setCategories([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { categories, loading, error, refreshCategories }
}
