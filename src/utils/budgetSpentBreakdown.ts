import type { Expense, MonthlyBudget } from '../types'

/** Expense.tags（カンマ区切り）をタグ名配列に分解。MonthlySummary と同じ区切り */
export function parseExpenseTagNames(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * カテゴリー別予算の実績。
 * Expense.bigCategory と budget.categoryName を文字列一致で突合。
 */
export function sumSpentForCategory(expenses: Expense[], categoryName: string): number {
  let sum = 0
  for (const e of expenses) {
    if ((e.bigCategory || '') === categoryName) {
      sum += e.amount || 0
    }
  }
  return sum
}

/**
 * タグ別予算の実績。
 * そのタグを含む支出は金額を全額カウント（複数タグでも按分しない＝上限監視を厳しめに）。
 */
export function sumSpentForTag(expenses: Expense[], tagName: string): number {
  let sum = 0
  for (const e of expenses) {
    const names = parseExpenseTagNames(e.tags || '')
    if (names.includes(tagName)) {
      sum += e.amount || 0
    }
  }
  return sum
}

export type ScopedBudgetProgress = {
  key: string
  kind: 'category' | 'tag'
  label: string
  limit: number
  used: number
  remaining: number
  over: boolean
  ratio: number
}

export function buildScopedBudgetProgress(
  budgets: MonthlyBudget[],
  expenses: Expense[]
): ScopedBudgetProgress[] {
  const rows: ScopedBudgetProgress[] = []

  for (const b of budgets) {
    if (b.categoryId && b.categoryName && !b.tagId) {
      const used = sumSpentForCategory(expenses, b.categoryName)
      const remaining = b.amountLimit - used
      rows.push({
        key: `cat:${b.categoryId}`,
        kind: 'category',
        label: b.categoryName,
        limit: b.amountLimit,
        used,
        remaining,
        over: used > b.amountLimit,
        ratio: b.amountLimit > 0 ? used / b.amountLimit : used > 0 ? Infinity : 0,
      })
    } else if (b.tagId && b.tagName) {
      const used = sumSpentForTag(expenses, b.tagName)
      const remaining = b.amountLimit - used
      rows.push({
        key: `tag:${b.tagId}`,
        kind: 'tag',
        label: b.tagName,
        limit: b.amountLimit,
        used,
        remaining,
        over: used > b.amountLimit,
        ratio: b.amountLimit > 0 ? used / b.amountLimit : used > 0 ? Infinity : 0,
      })
    }
  }

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'category' ? -1 : 1
    return a.label.localeCompare(b.label, 'ja')
  })
  return rows
}
