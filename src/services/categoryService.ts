import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Category, CreateCategoryInput } from '../types'

export const categoryService = {
  // すべてのカテゴリーを取得
  async getAllCategories(): Promise<Category[]> {
    const categoriesRef = collection(db, 'categories')
    const querySnapshot = await getDocs(categoriesRef)

    const categories: Category[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      categories.push({
        id: doc.id,
        name: data.name || doc.id,
      })
    })

    // 名前でソート（日本語順）
    categories.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    return categories
  },

  // カテゴリーを作成
  async createCategory(input: CreateCategoryInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'categories'), {
      name: input.name.trim(),
    })

    return docRef.id
  },

  // カテゴリーを更新
  async updateCategory(categoryId: string, input: CreateCategoryInput): Promise<void> {
    const categoryRef = doc(db, 'categories', categoryId)
    await updateDoc(categoryRef, {
      name: input.name.trim(),
    })
  },

  // カテゴリーを削除
  async deleteCategory(categoryId: string): Promise<void> {
    const categoryRef = doc(db, 'categories', categoryId)
    await deleteDoc(categoryRef)
  },
}

