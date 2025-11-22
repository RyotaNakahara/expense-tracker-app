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
  paymentMethod: string
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
}

// タグ作成用の入力型
export interface CreateTagInput {
  name: string
  categoryId: string
}

