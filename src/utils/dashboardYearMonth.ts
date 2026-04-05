/** ダッシュボードの年月プルダウン用（{ year, month } の比較・年リスト生成） */

export function isSameYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number }
): boolean {
  return a.year === b.year && a.month === b.month
}

/** 選択年を含む、今年±の年一覧（プルダウン用） */
export function buildDashboardYearOptions(selectedYear: number): number[] {
  const cy = new Date().getFullYear()
  const from = Math.min(selectedYear, cy - 10)
  const to = Math.max(selectedYear, cy + 1)
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}
