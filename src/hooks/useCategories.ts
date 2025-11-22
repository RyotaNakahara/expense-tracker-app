import { useState, useEffect } from 'react'
import { categoryService } from '../services/categoryService'
import type { Category } from '../types'

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await categoryService.getAllCategories()
        setCategories(data)
      } catch (e) {
        console.error('Failed to load categories', e)
        setError(e as Error)
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const refreshCategories = async () => {
    try {
      const data = await categoryService.getAllCategories()
      setCategories(data)
      setError(null)
    } catch (e) {
      console.error('Failed to refresh categories', e)
      setError(e as Error)
    }
  }

  return { categories, loading, error, refreshCategories }
}

