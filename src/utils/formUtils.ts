// フォームのリセット用のユーティリティ

export const getInitialExpenseFormData = () => ({
  date: new Date().toISOString().split('T')[0],
  amount: '',
  bigCategory: '',
  tags: [] as string[],
  paymentMethod: '',
  description: '',
})

