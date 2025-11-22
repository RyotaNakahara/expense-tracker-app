import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

export interface PaymentMethod {
  id: string
  name: string
  order?: number // 表示順序
}

export interface CreatePaymentMethodInput {
  name: string
  order?: number
}

export const paymentMethodService = {
  // すべての支払い方法を取得
  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    const paymentMethodsRef = collection(db, 'paymentMethods')
    const querySnapshot = await getDocs(paymentMethodsRef)

    const paymentMethods: PaymentMethod[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      paymentMethods.push({
        id: doc.id,
        name: data.name || doc.id,
        order: data.order || 0,
      })
    })

    // orderでソート、同じ場合は名前でソート
    paymentMethods.sort((a, b) => {
      if (a.order !== b.order) {
        return (a.order || 0) - (b.order || 0)
      }
      return a.name.localeCompare(b.name, 'ja')
    })

    return paymentMethods
  },

  // 支払い方法を作成
  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'paymentMethods'), {
      name: input.name.trim(),
      order: input.order || 0,
    })

    return docRef.id
  },

  // 支払い方法を更新
  async updatePaymentMethod(
    paymentMethodId: string,
    input: CreatePaymentMethodInput
  ): Promise<void> {
    const paymentMethodRef = doc(db, 'paymentMethods', paymentMethodId)
    await updateDoc(paymentMethodRef, {
      name: input.name.trim(),
      order: input.order || 0,
    })
  },

  // 支払い方法を削除
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const paymentMethodRef = doc(db, 'paymentMethods', paymentMethodId)
    await deleteDoc(paymentMethodRef)
  },
}

