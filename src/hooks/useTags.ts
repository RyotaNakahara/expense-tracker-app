import { useState, useEffect } from 'react'
import { tagService } from '../services/tagService'
import type { Tag } from '../types'

export const useTags = (categoryId?: string) => {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await tagService.getAllTags()
        setAllTags(data)
      } catch (e) {
        console.error('Failed to load tags', e)
        setError(e as Error)
        setAllTags([])
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [])

  useEffect(() => {
    if (categoryId) {
      const filtered = allTags.filter((tag) => tag.categoryId === categoryId)
      setFilteredTags(filtered)
    } else {
      setFilteredTags([])
    }
  }, [categoryId, allTags])

  const refreshTags = async () => {
    try {
      const data = await tagService.getAllTags()
      setAllTags(data)
      setError(null)
    } catch (e) {
      console.error('Failed to refresh tags', e)
      setError(e as Error)
    }
  }

  return { allTags, filteredTags, loading, error, refreshTags }
}

