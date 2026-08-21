import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  buildScopedBudgetProgress,
  parseExpenseTagNames,
  sumSpentForCategory,
  sumSpentForTag,
} from './budgetSpentBreakdown'
import type { Expense, MonthlyBudget } from '../types'

function expense(partial: Partial<Expense> & Pick<Expense, 'amount' | 'bigCategory' | 'tags'>): Expense {
  const ts = Timestamp.now()
  return {
    id: partial.id ?? 'e1',
    date: ts,
    userId: 'u1',
    createdAt: ts,
    updatedAt: ts,
    paymentMethod: '',
    description: '',
    ...partial,
  }
}

function budget(partial: Partial<MonthlyBudget>): MonthlyBudget {
  return {
    id: 'b1',
    userId: 'u1',
    year: 2026,
    month: 4,
    amountLimit: 10000,
    categoryId: null,
    categoryName: null,
    tagId: null,
    tagName: null,
    updatedAt: Timestamp.now(),
    ...partial,
  }
}

describe('parseExpenseTagNames', () => {
  it('splits comma-separated tags', () => {
    expect(parseExpenseTagNames('ランチ, コンビニ')).toEqual(['ランチ', 'コンビニ'])
    expect(parseExpenseTagNames('ランチ,コンビニ')).toEqual(['ランチ', 'コンビニ'])
  })
})

describe('sumSpentForCategory', () => {
  it('sums matching bigCategory', () => {
    const list = [
      expense({ amount: 1000, bigCategory: '食費', tags: '' }),
      expense({ amount: 2000, bigCategory: '交通', tags: '' }),
      expense({ amount: 500, bigCategory: '食費', tags: '' }),
    ]
    expect(sumSpentForCategory(list, '食費')).toBe(1500)
  })
})

describe('sumSpentForTag', () => {
  it('counts full amount when tag is included', () => {
    const list = [
      expense({ amount: 1000, bigCategory: '食費', tags: 'ランチ, 同僚' }),
      expense({ amount: 2000, bigCategory: '食費', tags: 'コンビニ' }),
    ]
    expect(sumSpentForTag(list, 'ランチ')).toBe(1000)
    expect(sumSpentForTag(list, '同僚')).toBe(1000)
  })
})

describe('buildScopedBudgetProgress', () => {
  it('builds category and tag rows', () => {
    const budgets = [
      budget({
        id: 'c1',
        categoryId: 'cat1',
        categoryName: '食費',
        amountLimit: 5000,
      }),
      budget({
        id: 't1',
        tagId: 'tag1',
        tagName: 'ランチ',
        amountLimit: 2000,
      }),
      budget({ id: 'total', amountLimit: 50000 }),
    ]
    const expenses = [
      expense({ amount: 3000, bigCategory: '食費', tags: 'ランチ' }),
      expense({ amount: 500, bigCategory: '食費', tags: '' }),
    ]
    const rows = buildScopedBudgetProgress(budgets, expenses)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      kind: 'category',
      label: '食費',
      used: 3500,
      remaining: 1500,
      over: false,
    })
    expect(rows[1]).toMatchObject({
      kind: 'tag',
      label: 'ランチ',
      used: 3000,
      remaining: -1000,
      over: true,
    })
  })
})
