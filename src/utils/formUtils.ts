// フォームのリセット用のユーティリティ

export const getInitialExpenseFormData = () => ({
  date: new Date().toISOString().split('T')[0],
  amount: '',
  bigCategory: '',
  tags: [] as string[],
  paymentMethod: '',
  description: '',
})

export const getInitialIncomeFormData = () => ({
  date: new Date().toISOString().split('T')[0],
  amount: '',
  category: '',
  description: '',
})

