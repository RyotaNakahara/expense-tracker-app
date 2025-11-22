import { Timestamp } from 'firebase/firestore'

// タイムスタンプを日付文字列に変換
export const formatDate = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '-'
  const date = timestamp.toDate()
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// タイムスタンプを日時文字列に変換
export const formatDateTime = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '-'
  const date = timestamp.toDate()
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

