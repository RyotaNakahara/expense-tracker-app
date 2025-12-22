import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../types'

export const expenseService = {
  // ユーザーIDで支出一覧を取得
  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    const expensesRef = collection(db, 'expenses')
    const q = query(expensesRef, where('userId', '==', userId))
    const querySnapshot = await getDocs(q)

    const expenses: Expense[] = []
    querySnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
      } as Expense)
    })

    // 日付でソート（新しい順）
    expenses.sort((a, b) => {
      const dateA = a.date?.toMillis() || 0
      const dateB = b.date?.toMillis() || 0
      return dateB - dateA
    })

    return expenses
  },

  // 支出を作成
  async createExpense(userId: string, input: CreateExpenseInput): Promise<string> {
    const now = Timestamp.now()
    const expenseDate = Timestamp.fromDate(input.date)
    const tagsString = input.tags.join(', ')

    const docRef = await addDoc(collection(db, 'expenses'), {
      userId,
      date: expenseDate,
      amount: input.amount,
      bigCategory: input.bigCategory,
      tags: tagsString,
      paymentMethod: input.paymentMethod,
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
    })

    return docRef.id
  },

  // 支出を更新
  async updateExpense(expenseId: string, input: UpdateExpenseInput): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId)
    const updateData: {
      updatedAt: Timestamp
      date?: Timestamp
      amount?: number
      bigCategory?: string
      tags?: string
      paymentMethod?: string
      description?: string
    } = {
      updatedAt: Timestamp.now(),
    }

    if (input.date) updateData.date = Timestamp.fromDate(input.date)
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.bigCategory) updateData.bigCategory = input.bigCategory
    if (input.tags) updateData.tags = input.tags.join(', ')
    if (input.paymentMethod) updateData.paymentMethod = input.paymentMethod
    if (input.description !== undefined) updateData.description = input.description

    await updateDoc(expenseRef, updateData)
  },

  // 支出を削除
  async deleteExpense(expenseId: string): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId)
    await deleteDoc(expenseRef)
  },
}

