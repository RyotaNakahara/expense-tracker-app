// 支払い方法の選択肢
export const PAYMENT_METHODS = [
  '現金',
  'クレジットカード',
  'PayPay',
  'その他',
] as const

// 支払い方法の型
export type PaymentMethod = typeof PAYMENT_METHODS[number]

