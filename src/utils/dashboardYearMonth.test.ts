import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSameYearMonth, buildDashboardYearOptions } from './dashboardYearMonth'

describe('isSameYearMonth', () => {
  it('returns true when year and month match', () => {
    expect(isSameYearMonth({ year: 2026, month: 4 }, { year: 2026, month: 4 })).toBe(true)
  })

  it('returns false when year or month differs', () => {
    expect(isSameYearMonth({ year: 2026, month: 4 }, { year: 2026, month: 5 })).toBe(false)
    expect(isSameYearMonth({ year: 2026, month: 4 }, { year: 2025, month: 4 })).toBe(false)
  })
})

describe('buildDashboardYearOptions', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes selected year and spans default window around current year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

    const opts = buildDashboardYearOptions(2026)
    expect(opts[0]).toBe(2016)
    expect(opts[opts.length - 1]).toBe(2027)
    expect(opts).toContain(2026)
  })

  it('extends range when selected year is far in the past', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

    const opts = buildDashboardYearOptions(2010)
    expect(opts).toContain(2010)
    expect(opts[0]).toBeLessThanOrEqual(2010)
  })
})
