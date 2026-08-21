import { describe, it, expect } from 'vitest'
import { previousCalendarMonth } from './budgetMonth'

describe('previousCalendarMonth', () => {
  it('returns previous month in same year', () => {
    expect(previousCalendarMonth(2026, 4)).toEqual({ year: 2026, month: 3 })
  })

  it('returns December of previous year when month is January', () => {
    expect(previousCalendarMonth(2026, 1)).toEqual({ year: 2025, month: 12 })
  })
})
