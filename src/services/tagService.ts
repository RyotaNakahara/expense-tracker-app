import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Tag, CreateTagInput } from '../types'

export const tagService = {
  // すべてのタグを取得
  async getAllTags(): Promise<Tag[]> {
    const tagsRef = collection(db, 'tags')
    const querySnapshot = await getDocs(tagsRef)

    const tags: Tag[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      tags.push({
        id: doc.id,
        name: data.name || doc.id,
        categoryId: data.categoryId || '',
        order: data.order ?? undefined,
      })
    })

    // 順序でソート（orderがない場合は最後、同じorderの場合は名前でソート）
    tags.sort((a, b) => {
      const orderA = a.order ?? Infinity
      const orderB = b.order ?? Infinity
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.name.localeCompare(b.name, 'ja')
    })

    return tags
  },

  // カテゴリーIDでタグを取得
  async getTagsByCategoryId(categoryId: string): Promise<Tag[]> {
    const tagsRef = collection(db, 'tags')
    const q = query(tagsRef, where('categoryId', '==', categoryId))
    const querySnapshot = await getDocs(q)

    const tags: Tag[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      tags.push({
        id: doc.id,
        name: data.name || doc.id,
        categoryId: data.categoryId || '',
        order: data.order ?? undefined,
      })
    })

    // 順序でソート（orderがない場合は最後、同じorderの場合は名前でソート）
    tags.sort((a, b) => {
      const orderA = a.order ?? Infinity
      const orderB = b.order ?? Infinity
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.name.localeCompare(b.name, 'ja')
    })

    return tags
  },

  // タグを作成
  async createTag(input: CreateTagInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'tags'), {
      name: input.name.trim(),
      categoryId: input.categoryId,
    })

    return docRef.id
  },

  // タグを更新
  async updateTag(tagId: string, input: CreateTagInput): Promise<void> {
    const tagRef = doc(db, 'tags', tagId)
    await updateDoc(tagRef, {
      name: input.name.trim(),
      categoryId: input.categoryId,
    })
  },

  // タグを削除
  async deleteTag(tagId: string): Promise<void> {
    const tagRef = doc(db, 'tags', tagId)
    await deleteDoc(tagRef)
  },

  // タグの順序を更新
  async updateTagOrder(tagId: string, order: number): Promise<void> {
    const tagRef = doc(db, 'tags', tagId)
    await updateDoc(tagRef, {
      order,
    })
  },

  // 複数のタグの順序を一括更新
  async updateTagsOrder(updates: { id: string; order: number }[]): Promise<void> {
    const updatePromises = updates.map(({ id, order }) =>
      updateDoc(doc(db, 'tags', id), { order })
    )
    await Promise.all(updatePromises)
  },
}

