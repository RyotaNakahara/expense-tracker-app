import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cacheGet,
  cacheSet,
  cacheInvalidatePrefix,
  spentYearCacheKey,
  totalBudgetYearCacheKey,
} from './firestoreReadCache'

describe('firestoreReadCache', () => {
  beforeEach(() => {
    cacheInvalidatePrefix('')
  })

  afterEach(() => {
    vi.useRealTimers()
    cacheInvalidatePrefix('')
  })

  it('returns undefined for missing keys', () => {
    expect(cacheGet('missing')).toBeUndefined()
  })

  it('stores and retrieves values', () => {
    cacheSet('k', { a: 1 })
    expect(cacheGet<{ a: number }>('k')).toEqual({ a: 1 })
  })

  it('expires values after ttl', () => {
    vi.useFakeTimers()
    cacheSet('ttl', 42, 1000)
    expect(cacheGet<number>('ttl')).toBe(42)
    vi.advanceTimersByTime(1001)
    expect(cacheGet<number>('ttl')).toBeUndefined()
  })

  it('invalidates by prefix', () => {
    cacheSet('spent:u1:2026:1-12', { 1: 100 })
    cacheSet('totalBudget:u1:2026', { 1: 50 })
    cacheInvalidatePrefix('spent:u1:')
    expect(cacheGet('spent:u1:2026:1-12')).toBeUndefined()
    expect(cacheGet('totalBudget:u1:2026')).toEqual({ 1: 50 })
  })

  it('builds stable cache keys', () => {
    expect(spentYearCacheKey('u1', 2026, 8)).toBe('spent:u1:2026:1-8')
    expect(totalBudgetYearCacheKey('u1', 2026)).toBe('totalBudget:u1:2026')
  })
})
