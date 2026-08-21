import { describe, expect, it } from 'vitest'
import {
  buildYearMonthBudgetSpent,
  computeCarryoverChain,
  formatCarryoverYen,
} from './budgetCarryover'

describe('computeCarryoverChain', () => {
  it('carries unused budget to the next month', () => {
    const result = computeCarryoverChain([
      { year: 2026, month: 1, budgetLimit: 100_000, spent: 70_000 },
      { year: 2026, month: 2, budgetLimit: 100_000, spent: 110_000 },
      { year: 2026, month: 3, budgetLimit: 100_000, spent: 50_000 },
    ])

    expect(result[0]).toMatchObject({
      carryIn: 0,
      available: 100_000,
      remaining: 30_000,
      carryOut: 30_000,
    })
    expect(result[1]).toMatchObject({
      carryIn: 30_000,
      available: 130_000,
      remaining: 20_000,
      carryOut: 20_000,
    })
    expect(result[2]).toMatchObject({
      carryIn: 20_000,
      available: 120_000,
      remaining: 70_000,
      carryOut: 70_000,
    })
  })

  it('carries deficit as negative to the next month', () => {
    const result = computeCarryoverChain([
      { year: 2026, month: 1, budgetLimit: 50_000, spent: 80_000 },
      { year: 2026, month: 2, budgetLimit: 50_000, spent: 10_000 },
    ])

    expect(result[0]).toMatchObject({
      remaining: -30_000,
      carryOut: -30_000,
    })
    expect(result[1]).toMatchObject({
      carryIn: -30_000,
      available: 20_000,
      remaining: 10_000,
      carryOut: 10_000,
    })
  })

  it('treats unset budget with spending as negative carry', () => {
    const result = computeCarryoverChain([
      { year: 2026, month: 1, budgetLimit: 100_000, spent: 40_000 },
      { year: 2026, month: 2, budgetLimit: null, spent: 10_000 },
      { year: 2026, month: 3, budgetLimit: 100_000, spent: 0 },
    ])

    expect(result[0].carryOut).toBe(60_000)
    expect(result[1]).toMatchObject({
      carryIn: 60_000,
      available: 60_000,
      remaining: 50_000,
      carryOut: 50_000,
    })
    expect(result[2].carryIn).toBe(50_000)
  })

  it('makes unset budget month negative when spend exceeds carry-in', () => {
    const result = computeCarryoverChain([
      { year: 2026, month: 1, budgetLimit: null, spent: 25_000 },
      { year: 2026, month: 2, budgetLimit: 100_000, spent: 0 },
    ])

    expect(result[0]).toMatchObject({
      carryIn: 0,
      available: 0,
      remaining: -25_000,
      carryOut: -25_000,
    })
    expect(result[1]).toMatchObject({
      carryIn: -25_000,
      available: 75_000,
    })
  })

  it('uses initialCarryIn for the first month (including negative)', () => {
    const result = computeCarryoverChain(
      [{ year: 2026, month: 1, budgetLimit: 100_000, spent: 90_000 }],
      -25_000
    )
    expect(result[0]).toMatchObject({
      carryIn: -25_000,
      available: 75_000,
      remaining: -15_000,
      carryOut: -15_000,
    })
  })
})

describe('buildYearMonthBudgetSpent', () => {
  it('builds 12 months', () => {
    const list = buildYearMonthBudgetSpent(
      2026,
      { 1: 100, 3: 200 },
      { 1: 50, 2: 10 }
    )
    expect(list).toHaveLength(12)
    expect(list[0]).toEqual({ year: 2026, month: 1, budgetLimit: 100, spent: 50, income: 0 })
    expect(list[1]).toEqual({ year: 2026, month: 2, budgetLimit: null, spent: 10, income: 0 })
    expect(list[2]).toEqual({ year: 2026, month: 3, budgetLimit: 200, spent: 0, income: 0 })
  })

  it('includes income by month when provided', () => {
    const list = buildYearMonthBudgetSpent(2026, { 1: 100 }, { 1: 50 }, { 1: 20 })
    expect(list[0]).toEqual({
      year: 2026,
      month: 1,
      budgetLimit: 100,
      spent: 50,
      income: 20,
    })
  })
})

describe('computeCarryoverChain with income', () => {
  it('adds income into available and carry-out', () => {
    const result = computeCarryoverChain([
      { year: 2026, month: 1, budgetLimit: 100_000, spent: 80_000, income: 30_000 },
      { year: 2026, month: 2, budgetLimit: 100_000, spent: 50_000, income: 0 },
    ])
    // available = 100k + 0 + 30k = 130k; remaining = 50k
    expect(result[0]).toMatchObject({
      income: 30_000,
      available: 130_000,
      remaining: 50_000,
      carryOut: 50_000,
    })
    expect(result[1]).toMatchObject({
      carryIn: 50_000,
      available: 150_000,
      remaining: 100_000,
    })
  })
})

describe('formatCarryoverYen', () => {
  it('formats positive and negative', () => {
    expect(formatCarryoverYen(1200)).toBe('¥1,200')
    expect(formatCarryoverYen(-1200)).toBe('−¥1,200')
  })
})
