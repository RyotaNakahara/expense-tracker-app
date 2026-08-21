import { Timestamp } from 'firebase/firestore'

// Expense型の定義
export interface Expense {
  id: string
  date: Timestamp
  amount: number
  userId: string
  bigCategory: string
  tags: string
  paymentMethod: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// 支出作成用の入力型
export interface CreateExpenseInput {
  date: Date
  amount: number
  bigCategory: string
  tags: string[]
  paymentMethod?: string
  description?: string
}

// 支出更新用の入力型
export interface UpdateExpenseInput {
  date?: Date
  amount?: number
  bigCategory?: string
  tags?: string[]
  paymentMethod?: string
  description?: string
}

// Category型の定義
export interface Category {
  id: string
  name: string
  order?: number
}

// カテゴリー作成用の入力型
export interface CreateCategoryInput {
  name: string
}

// Tag型の定義
export interface Tag {
  id: string
  name: string
  categoryId: string
  order?: number
}

// タグ作成用の入力型
export interface CreateTagInput {
  name: string
  categoryId: string
}

/** 月次予算（全体・カテゴリー別・タグ別）。ドキュメント ID は periodId または periodId__cat__ / periodId__tag__ 接尾辞 */
export interface MonthlyBudget {
  id: string
  userId: string
  year: number
  month: number
  amountLimit: number
  categoryId: string | null
  categoryName: string | null
  tagId: string | null
  tagName: string | null
  createdAt?: Timestamp
  updatedAt: Timestamp
}

/** setBudget 用。全体はすべて省略。カテゴリー別・タグ別は同時に指定しない */
export interface SetBudgetOptions {
  categoryId?: string
  categoryName?: string
  tagId?: string
  tagName?: string
}

// Income型の定義
export interface Income {
  id: string
  date: Timestamp
  amount: number
  userId: string
  /** 収入カテゴリー名（給与など） */
  category: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateIncomeInput {
  date: Date
  amount: number
  category: string
  description?: string
}

export interface UpdateIncomeInput {
  date?: Date
  amount?: number
  category?: string
  description?: string
}

