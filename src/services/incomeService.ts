import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  writeBatch,
  Timestamp,
  increment,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { monthlyTotalPeriodId } from './expenseService'
import {
  cacheGet,
  cacheInvalidatePrefix,
  cacheSet,
  incomeYearCacheKey,
} from '../utils/firestoreReadCache'
import type { Income, CreateIncomeInput, UpdateIncomeInput } from '../types'

const COLLECTION = 'incomes'

function monthlyIncomeTotalDocRef(userId: string, year: number, month: number) {
  return doc(db, 'users', userId, 'monthlyIncomeTotals', monthlyTotalPeriodId(year, month))
}

function docToIncome(id: string, d: DocumentData): Income {
  return { id, ...d } as Income
}

function sameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function applyMonthlyIncomeDeltaInBatch(
  batch: ReturnType<typeof writeBatch>,
  userId: string,
  incomeDate: Date,
  delta: number
): void {
  const y = incomeDate.getFullYear()
  const m = incomeDate.getMonth() + 1
  const ref = monthlyIncomeTotalDocRef(userId, y, m)
  batch.set(
    ref,
    {
      userId,
      year: y,
      month: m,
      total: increment(delta),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}

function monthDateRangeTimestamps(year: number, month: number): { start: Timestamp; end: Timestamp } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) }
}

function incomesInMonthOrderedQuery(userId: string, year: number, month: number) {
  const { start, end } = monthDateRangeTimestamps(year, month)
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  )
}

export const incomeService = {
  async getIncomesInMonth(userId: string, year: number, month: number): Promise<Income[]> {
    const snap = await getDocs(incomesInMonthOrderedQuery(userId, year, month))
    const list: Income[] = []
    snap.forEach((d) => {
      list.push(docToIncome(d.id, d.data()))
    })
    return list
  },

  async getMonthlyIncomeTotalForDisplay(userId: string, year: number, month: number): Promise<number> {
    const ref = monthlyIncomeTotalDocRef(userId, year, month)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return Number(snap.data()?.total ?? 0)
    }
    const list = await this.getIncomesInMonth(userId, year, month)
    const total = list.reduce((s, i) => s + (i.amount || 0), 0)
    await setDoc(ref, {
      userId,
      year,
      month,
      total,
      updatedAt: Timestamp.now(),
    })
    return total
  },

  /**
   * 指定年の1〜throughMonth の収入合計（円）。セッションキャッシュあり。
   */
  async getIncomeByMonthForYear(
    userId: string,
    year: number,
    throughMonth = 12
  ): Promise<Record<number, number>> {
    const end = Math.min(12, Math.max(1, throughMonth))
    const cacheKey = incomeYearCacheKey(userId, year, end)
    const cached = cacheGet<Record<number, number>>(cacheKey)
    if (cached) return { ...cached }

    const pairs = await Promise.all(
      Array.from({ length: end }, async (_, i) => {
        const month = i + 1
        const total = await this.getMonthlyIncomeTotalForDisplay(userId, year, month)
        return [month, total] as const
      })
    )
    const map: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) map[m] = 0
    for (const [month, total] of pairs) {
      map[month] = total
    }
    cacheSet(cacheKey, map)
    return map
  },

  invalidateIncomeCaches(userId: string): void {
    cacheInvalidatePrefix(`income:${userId}:`)
  },

  async createIncome(userId: string, input: CreateIncomeInput): Promise<string> {
    const now = Timestamp.now()
    const incomeDate = Timestamp.fromDate(input.date)

    const batch = writeBatch(db)
    const incomeRef = doc(collection(db, COLLECTION))
    batch.set(incomeRef, {
      userId,
      date: incomeDate,
      amount: input.amount,
      category: input.category,
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
    })
    applyMonthlyIncomeDeltaInBatch(batch, userId, input.date, input.amount)
    await batch.commit()
    this.invalidateIncomeCaches(userId)
    return incomeRef.id
  },

  async updateIncome(incomeId: string, input: UpdateIncomeInput): Promise<void> {
    const incomeRef = doc(db, COLLECTION, incomeId)
    const oldSnap = await getDoc(incomeRef)
    if (!oldSnap.exists()) {
      throw new Error('Income not found')
    }
    const old = oldSnap.data()
    const oldUserId = old.userId as string
    const oldDate = (old.date as Timestamp).toDate()
    const oldAmount = (old.amount as number) || 0

    const newDate = input.date ?? oldDate
    const newAmount = input.amount !== undefined ? input.amount : oldAmount

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    }
    if (input.date) updateData.date = Timestamp.fromDate(input.date)
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.category) updateData.category = input.category
    if (input.description !== undefined) updateData.description = input.description

    const batch = writeBatch(db)
    batch.update(incomeRef, updateData as Record<string, never>)

    if (sameCalendarMonth(oldDate, newDate)) {
      const delta = newAmount - oldAmount
      if (delta !== 0) {
        applyMonthlyIncomeDeltaInBatch(batch, oldUserId, oldDate, delta)
      }
    } else {
      applyMonthlyIncomeDeltaInBatch(batch, oldUserId, oldDate, -oldAmount)
      applyMonthlyIncomeDeltaInBatch(batch, oldUserId, newDate, newAmount)
    }

    await batch.commit()
    this.invalidateIncomeCaches(oldUserId)
  },

  async deleteIncome(incomeId: string): Promise<void> {
    const incomeRef = doc(db, COLLECTION, incomeId)
    const oldSnap = await getDoc(incomeRef)
    if (!oldSnap.exists()) {
      throw new Error('Income not found')
    }
    const old = oldSnap.data()
    const userId = old.userId as string
    const incomeDate = (old.date as Timestamp).toDate()
    const amount = (old.amount as number) || 0

    const batch = writeBatch(db)
    batch.delete(incomeRef)
    applyMonthlyIncomeDeltaInBatch(batch, userId, incomeDate, -amount)
    await batch.commit()
    this.invalidateIncomeCaches(userId)
  },
}
