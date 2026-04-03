import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  writeBatch,
  Timestamp,
  increment,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../types'

const COLLECTION = 'expenses'

export type ExpensePageResult = {
  expenses: Expense[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

function monthlyTotalPeriodId(year: number, month: number): string {
  return `${year}_${String(month).padStart(2, '0')}`
}

function monthlyTotalDocRef(userId: string, year: number, month: number) {
  return doc(db, 'users', userId, 'monthlyTotals', monthlyTotalPeriodId(year, month))
}

function docToExpense(id: string, d: DocumentData): Expense {
  return { id, ...d } as Expense
}

function sameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function applyMonthlyDeltaInBatch(
  batch: ReturnType<typeof writeBatch>,
  userId: string,
  expenseDate: Date,
  delta: number
): void {
  const y = expenseDate.getFullYear()
  const m = expenseDate.getMonth() + 1
  const ref = monthlyTotalDocRef(userId, y, m)
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

/** 指定暦月の支出クエリ（userId + date 範囲 + date 降順）。getExpensesInMonth / 月次合計集計で共有 */
function expensesInMonthOrderedQuery(userId: string, year: number, month: number) {
  const { start, end } = monthDateRangeTimestamps(year, month)
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  )
}

async function sumExpensesInMonth(
  userId: string,
  year: number,
  month: number
): Promise<number> {
  const snap = await getDocs(expensesInMonthOrderedQuery(userId, year, month))
  let sum = 0
  snap.forEach((d) => {
    sum += (d.data().amount as number) || 0
  })
  return sum
}

export const expenseService = {
  /** 一覧画面・月次ページ用（全件取得。読取は件数分） */
  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    const expensesRef = collection(db, COLLECTION)
    const q = query(expensesRef, where('userId', '==', userId))
    const querySnapshot = await getDocs(q)

    const expenses: Expense[] = []
    querySnapshot.forEach((d) => {
      expenses.push(docToExpense(d.id, d.data()))
    })

    expenses.sort((a, b) => {
      const dateA = a.date?.toMillis() || 0
      const dateB = b.date?.toMillis() || 0
      return dateB - dateA
    })

    return expenses
  },

  /**
   * 指定月の支出のみ取得。範囲フィルタと同じフィールドで orderBy が必要なため date 降順（複合インデックス: userId + date）。
   */
  async getExpensesInMonth(userId: string, year: number, month: number): Promise<Expense[]> {
    const snap = await getDocs(expensesInMonthOrderedQuery(userId, year, month))
    const list: Expense[] = []
    snap.forEach((d) => {
      list.push(docToExpense(d.id, d.data()))
    })
    return list
  },

  /**
   * 指定月のみサーバー側ページング（最大 pageSize+1 件読取）
   */
  async getExpensesPageForMonth(
    userId: string,
    year: number,
    month: number,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<ExpensePageResult> {
    const { start, end } = monthDateRangeTimestamps(year, month)
    const expensesRef = collection(db, COLLECTION)
    const base = [
      where('userId', '==', userId),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc'),
      limit(pageSize + 1),
    ] as const
    const q = startAfterDoc
      ? query(expensesRef, ...base, startAfter(startAfterDoc))
      : query(expensesRef, ...base)

    const snap = await getDocs(q)
    const docs = snap.docs
    const hasMore = docs.length > pageSize
    const slice = hasMore ? docs.slice(0, pageSize) : docs

    const expenses = slice.map((d) => docToExpense(d.id, d.data()))
    const lastDoc = slice.length > 0 ? slice[slice.length - 1] : null

    return { expenses, lastDoc, hasMore }
  },

  /**
   * 全期間サーバー側ページング（最大 pageSize+1 件読取）
   */
  async getExpensesPage(
    userId: string,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<ExpensePageResult> {
    const expensesRef = collection(db, COLLECTION)
    const base = [
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(pageSize + 1),
    ] as const
    const q = startAfterDoc
      ? query(expensesRef, ...base, startAfter(startAfterDoc))
      : query(expensesRef, ...base)

    const snap = await getDocs(q)
    const docs = snap.docs
    const hasMore = docs.length > pageSize
    const slice = hasMore ? docs.slice(0, pageSize) : docs

    const expenses = slice.map((d) => docToExpense(d.id, d.data()))
    const lastDoc = slice.length > 0 ? slice[slice.length - 1] : null

    return { expenses, lastDoc, hasMore }
  },

  /**
   * ダッシュボード「今月の合計」用。集計ドキュメントが無ければ当月分だけ集計してキャッシュ。
   */
  async getMonthlyTotalForDisplay(userId: string, year: number, month: number): Promise<number> {
    const ref = monthlyTotalDocRef(userId, year, month)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return Number(snap.data()?.total ?? 0)
    }
    const total = await sumExpensesInMonth(userId, year, month)
    await setDoc(ref, {
      userId,
      year,
      month,
      total,
      updatedAt: Timestamp.now(),
    })
    return total
  },

  async createExpense(userId: string, input: CreateExpenseInput): Promise<string> {
    const now = Timestamp.now()
    const expenseDate = Timestamp.fromDate(input.date)
    const tagsString = input.tags.join(', ')

    const batch = writeBatch(db)
    const expenseRef = doc(collection(db, COLLECTION))
    batch.set(expenseRef, {
      userId,
      date: expenseDate,
      amount: input.amount,
      bigCategory: input.bigCategory,
      tags: tagsString,
      paymentMethod: input.paymentMethod ?? '',
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
    })
    applyMonthlyDeltaInBatch(batch, userId, input.date, input.amount)
    await batch.commit()
    return expenseRef.id
  },

  async updateExpense(expenseId: string, input: UpdateExpenseInput): Promise<void> {
    const expenseRef = doc(db, COLLECTION, expenseId)
    const oldSnap = await getDoc(expenseRef)
    if (!oldSnap.exists()) {
      throw new Error('Expense not found')
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
    if (input.bigCategory) updateData.bigCategory = input.bigCategory
    if (input.tags) updateData.tags = input.tags.join(', ')
    if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod
    if (input.description !== undefined) updateData.description = input.description

    const batch = writeBatch(db)
    batch.update(expenseRef, updateData as Record<string, never>)

    if (sameCalendarMonth(oldDate, newDate)) {
      const delta = newAmount - oldAmount
      if (delta !== 0) {
        applyMonthlyDeltaInBatch(batch, oldUserId, oldDate, delta)
      }
    } else {
      applyMonthlyDeltaInBatch(batch, oldUserId, oldDate, -oldAmount)
      applyMonthlyDeltaInBatch(batch, oldUserId, newDate, newAmount)
    }

    await batch.commit()
  },

  async deleteExpense(expenseId: string): Promise<void> {
    const expenseRef = doc(db, COLLECTION, expenseId)
    const oldSnap = await getDoc(expenseRef)
    if (!oldSnap.exists()) {
      throw new Error('Expense not found')
    }
    const old = oldSnap.data()
    const userId = old.userId as string
    const expenseDate = (old.date as Timestamp).toDate()
    const amount = (old.amount as number) || 0

    const batch = writeBatch(db)
    batch.delete(expenseRef)
    applyMonthlyDeltaInBatch(batch, userId, expenseDate, -amount)
    await batch.commit()
  },
}
