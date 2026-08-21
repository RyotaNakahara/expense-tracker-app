import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { monthlyTotalPeriodId } from './expenseService'
import {
  cacheGet,
  cacheInvalidatePrefix,
  cacheSet,
  totalBudgetYearCacheKey,
} from '../utils/firestoreReadCache'
import type { MonthlyBudget, SetBudgetOptions } from '../types'

function budgetsCollection(userId: string) {
  return collection(db, 'users', userId, 'budgets')
}

export function budgetDocId(
  year: number,
  month: number,
  options?: Pick<SetBudgetOptions, 'categoryId' | 'tagId'>
): string {
  const periodId = monthlyTotalPeriodId(year, month)
  if (options?.tagId) {
    return `${periodId}__tag__${options.tagId}`
  }
  if (options?.categoryId) {
    return `${periodId}__cat__${options.categoryId}`
  }
  return periodId
}

export function monthlyBudgetFromFirestore(id: string, d: DocumentData): MonthlyBudget {
  return {
    id,
    userId: (d.userId as string) ?? '',
    year: (d.year as number) ?? 0,
    month: (d.month as number) ?? 0,
    amountLimit: typeof d.amountLimit === 'number' ? d.amountLimit : 0,
    categoryId: (d.categoryId as string | null | undefined) ?? null,
    categoryName: (d.categoryName as string | null | undefined) ?? null,
    tagId: (d.tagId as string | null | undefined) ?? null,
    tagName: (d.tagName as string | null | undefined) ?? null,
    createdAt: d.createdAt as MonthlyBudget['createdAt'],
    updatedAt: (d.updatedAt as MonthlyBudget['updatedAt']) ?? Timestamp.now(),
  } satisfies MonthlyBudget
}

export async function getMonthlyTotalBudget(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyBudget | null> {
  const id = budgetDocId(year, month)
  const snap = await getDoc(doc(budgetsCollection(userId), id))
  if (!snap.exists()) return null
  return monthlyBudgetFromFirestore(snap.id, snap.data())
}

export async function getCategoryBudget(
  userId: string,
  year: number,
  month: number,
  categoryId: string
): Promise<MonthlyBudget | null> {
  const id = budgetDocId(year, month, { categoryId })
  const snap = await getDoc(doc(budgetsCollection(userId), id))
  if (!snap.exists()) return null
  return monthlyBudgetFromFirestore(snap.id, snap.data())
}

export async function getTagBudget(
  userId: string,
  year: number,
  month: number,
  tagId: string
): Promise<MonthlyBudget | null> {
  const id = budgetDocId(year, month, { tagId })
  const snap = await getDoc(doc(budgetsCollection(userId), id))
  if (!snap.exists()) return null
  return monthlyBudgetFromFirestore(snap.id, snap.data())
}

export async function listBudgetsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyBudget[]> {
  const q = query(budgetsCollection(userId), where('year', '==', year), where('month', '==', month))
  const snap = await getDocs(q)
  const list: MonthlyBudget[] = []
  snap.forEach((s) => {
    list.push(monthlyBudgetFromFirestore(s.id, s.data()))
  })
  list.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return list
}

/** 指定年の予算ドキュメントをすべて取得（全体・カテゴリー・タグ含む） */
export async function listBudgetsForYear(userId: string, year: number): Promise<MonthlyBudget[]> {
  const q = query(budgetsCollection(userId), where('year', '==', year))
  const snap = await getDocs(q)
  const list: MonthlyBudget[] = []
  snap.forEach((s) => {
    list.push(monthlyBudgetFromFirestore(s.id, s.data()))
  })
  list.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month
    return a.id.localeCompare(b.id, 'en')
  })
  return list
}

/** 指定年の全体予算のみ（カテゴリー・タグ別は含めない）。最大12 getDoc。 */
export async function listTotalBudgetLimitsForYear(
  userId: string,
  year: number
): Promise<Record<number, number | null>> {
  const cacheKey = totalBudgetYearCacheKey(userId, year)
  const cached = cacheGet<Record<number, number | null>>(cacheKey)
  if (cached) return { ...cached }

  const pairs = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1
      const b = await getMonthlyTotalBudget(userId, year, month)
      return [month, b?.amountLimit ?? null] as const
    })
  )
  const map: Record<number, number | null> = {}
  for (const [month, limit] of pairs) {
    map[month] = limit
  }
  cacheSet(cacheKey, map)
  return map
}

export function invalidateTotalBudgetYearCache(userId: string): void {
  cacheInvalidatePrefix(`totalBudget:${userId}:`)
}

function validateSetBudget(amountLimit: number, options?: SetBudgetOptions): void {
  if (!Number.isFinite(amountLimit) || amountLimit < 0 || !Number.isInteger(amountLimit)) {
    throw new Error('予算上限は0以上の整数で指定してください')
  }
  const hasCat = Boolean(options?.categoryId)
  const hasTag = Boolean(options?.tagId)
  if (hasCat && hasTag) {
    throw new Error('カテゴリー別とタグ別を同時に指定できません')
  }
  if (hasCat && !options?.categoryName) {
    throw new Error('カテゴリー別予算には categoryName が必要です')
  }
  if (hasTag && !options?.tagName) {
    throw new Error('タグ別予算には tagName が必要です')
  }
}

export async function setBudget(
  userId: string,
  year: number,
  month: number,
  amountLimit: number,
  options?: SetBudgetOptions
): Promise<void> {
  validateSetBudget(amountLimit, options)
  const id = budgetDocId(year, month, {
    categoryId: options?.categoryId,
    tagId: options?.tagId,
  })
  const ref = doc(budgetsCollection(userId), id)
  const existing = await getDoc(ref)
  const now = Timestamp.now()
  const hasCat = Boolean(options?.categoryId)
  const hasTag = Boolean(options?.tagId)
  await setDoc(
    ref,
    {
      userId,
      year,
      month,
      amountLimit,
      categoryId: hasCat ? options!.categoryId! : null,
      categoryName: hasCat ? options!.categoryName! : null,
      tagId: hasTag ? options!.tagId! : null,
      tagName: hasTag ? options!.tagName! : null,
      updatedAt: now,
      ...(!existing.exists() ? { createdAt: now } : {}),
    },
    { merge: true }
  )
  if (!hasCat && !hasTag) {
    invalidateTotalBudgetYearCache(userId)
  }
}

export async function deleteBudget(
  userId: string,
  year: number,
  month: number,
  options?: Pick<SetBudgetOptions, 'categoryId' | 'tagId'>
): Promise<void> {
  const id = budgetDocId(year, month, {
    categoryId: options?.categoryId,
    tagId: options?.tagId,
  })
  await deleteDoc(doc(budgetsCollection(userId), id))
  if (!options?.categoryId && !options?.tagId) {
    invalidateTotalBudgetYearCache(userId)
  }
}
