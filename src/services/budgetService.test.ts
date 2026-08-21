import { describe, it, expect, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'

vi.mock('../firebase/config', () => ({
  db: {},
  auth: {},
}))

const { budgetDocId, monthlyBudgetFromFirestore } = await import('../services/budgetService')

describe('budgetDocId', () => {
  it('builds total budget id', () => {
    expect(budgetDocId(2026, 3)).toBe('2026_03')
  })

  it('builds category and tag budget ids', () => {
    expect(budgetDocId(2026, 3, { categoryId: 'cat1' })).toBe('2026_03__cat__cat1')
    expect(budgetDocId(2026, 3, { tagId: 'tag1' })).toBe('2026_03__tag__tag1')
  })

  it('prefers tagId when both are provided', () => {
    expect(budgetDocId(2026, 3, { categoryId: 'cat1', tagId: 'tag1' })).toBe(
      '2026_03__tag__tag1'
    )
  })
})

describe('monthlyBudgetFromFirestore', () => {
  it('maps fields with defaults', () => {
    const updatedAt = Timestamp.now()
    const b = monthlyBudgetFromFirestore('2026_03', {
      userId: 'u1',
      year: 2026,
      month: 3,
      amountLimit: 10000,
      categoryId: null,
      tagId: null,
      updatedAt,
    })
    expect(b).toMatchObject({
      id: '2026_03',
      userId: 'u1',
      year: 2026,
      month: 3,
      amountLimit: 10000,
      categoryId: null,
      tagId: null,
    })
    expect(b.updatedAt).toBe(updatedAt)
  })

  it('defaults missing amountLimit to 0', () => {
    const b = monthlyBudgetFromFirestore('x', { userId: 'u1', year: 2026, month: 1 })
    expect(b.amountLimit).toBe(0)
  })
})
