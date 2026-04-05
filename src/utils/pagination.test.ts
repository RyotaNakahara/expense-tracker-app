import { describe, it, expect } from 'vitest'
import { buildPaginationItems } from './pagination'

describe('buildPaginationItems', () => {
  it('returns single page for total 1', () => {
    expect(buildPaginationItems(1, 1)).toEqual([1])
  })

  it('returns all pages when total is small', () => {
    expect(buildPaginationItems(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('includes ellipsis for large total', () => {
    const items = buildPaginationItems(5, 20)
    expect(items).toContain(1)
    expect(items).toContain(20)
    expect(items).toContain(5)
    expect(items).toContain('ellipsis')
  })
})
