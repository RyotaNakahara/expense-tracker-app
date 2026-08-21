/**
 * 月次全体予算の繰越計算。
 *
 * 方針:
 * - 有効予算 = 予算（未設定は0）+ 繰入 + 収入
 * - 繰越(次月へ) = 有効予算 − 実績（マイナス可）
 * - 超過・未設定月の支出は翌月の有効予算を減らす（マイナス繰越）
 */

export type MonthBudgetSpent = {
  year: number
  month: number
  /** null = 予算未設定 */
  budgetLimit: number | null
  spent: number
  /** その月の収入合計（円） */
  income?: number
}

export type MonthCarryover = {
  year: number
  month: number
  budgetLimit: number | null
  spent: number
  income: number
  /** 前月から繰り入れた額（マイナス可） */
  carryIn: number
  /** 有効予算 = 予算(0可) + 繰入 + 収入 */
  available: number
  /** available − spent（マイナス可） */
  remaining: number
  /** 翌月へ繰り越す額（remaining と同値、マイナス可） */
  carryOut: number
}

export function computeCarryoverChain(
  months: MonthBudgetSpent[],
  initialCarryIn = 0
): MonthCarryover[] {
  let carryIn = Number.isFinite(initialCarryIn) ? initialCarryIn : 0
  const out: MonthCarryover[] = []

  for (const m of months) {
    const spent = Number.isFinite(m.spent) ? m.spent : 0
    const income = Number.isFinite(m.income) ? (m.income as number) : 0
    const available = (m.budgetLimit ?? 0) + carryIn + income
    const remaining = available - spent
    const carryOut = remaining
    out.push({
      year: m.year,
      month: m.month,
      budgetLimit: m.budgetLimit,
      spent,
      income,
      carryIn,
      available,
      remaining,
      carryOut,
    })
    carryIn = carryOut
  }

  return out
}

/** 1〜12月分の入力から、表示年のチェーン用 MonthBudgetSpent を組み立てる */
export function buildYearMonthBudgetSpent(
  year: number,
  budgetByMonth: Record<number, number | null>,
  spentByMonth: Record<number, number>,
  incomeByMonth: Record<number, number> = {}
): MonthBudgetSpent[] {
  const list: MonthBudgetSpent[] = []
  for (let month = 1; month <= 12; month++) {
    list.push({
      year,
      month,
      budgetLimit: budgetByMonth[month] ?? null,
      spent: spentByMonth[month] ?? 0,
      income: incomeByMonth[month] ?? 0,
    })
  }
  return list
}

/** 繰越・繰入などの金額表示（マイナスは先頭に −） */
export function formatCarryoverYen(n: number): string {
  const abs = Math.round(Math.abs(n)).toLocaleString()
  return n < 0 ? `−¥${abs}` : `¥${abs}`
}
