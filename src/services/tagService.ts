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
      })
    })

    // 名前でソート（日本語順）
    tags.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

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
      })
    })

    tags.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

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
}

