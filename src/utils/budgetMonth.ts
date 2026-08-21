/** 暦月の直前の月（1月なら前年12月） */
export function previousCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) {
    return { year: year - 1, month: 12 }
  }
  return { year, month: month - 1 }
}
