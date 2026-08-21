import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Category, CreateCategoryInput } from '../types'

const COLLECTION = 'incomeCategories'

export const incomeCategoryService = {
  async getAllCategories(): Promise<Category[]> {
    const categoriesRef = collection(db, COLLECTION)
    const querySnapshot = await getDocs(categoriesRef)

    const categories: Category[] = []
    querySnapshot.forEach((d) => {
      const data = d.data()
      categories.push({
        id: d.id,
        name: data.name || d.id,
        order: data.order ?? undefined,
      })
    })

    categories.sort((a, b) => {
      const orderA = a.order ?? Infinity
      const orderB = b.order ?? Infinity
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.name.localeCompare(b.name, 'ja')
    })

    return categories
  },

  async createCategory(input: CreateCategoryInput): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      name: input.name.trim(),
    })
    return docRef.id
  },

  async updateCategory(categoryId: string, input: CreateCategoryInput): Promise<void> {
    const categoryRef = doc(db, COLLECTION, categoryId)
    await updateDoc(categoryRef, {
      name: input.name.trim(),
    })
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const categoryRef = doc(db, COLLECTION, categoryId)
    await deleteDoc(categoryRef)
  },

  async updateCategoryOrder(categoryId: string, order: number): Promise<void> {
    const categoryRef = doc(db, COLLECTION, categoryId)
    await updateDoc(categoryRef, { order })
  },

  async updateCategoriesOrder(updates: { id: string; order: number }[]): Promise<void> {
    await Promise.all(
      updates.map(({ id, order }) => updateDoc(doc(db, COLLECTION, id), { order }))
    )
  },
}
