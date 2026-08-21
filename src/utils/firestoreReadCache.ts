/**
 * セッション内の Firestore 読取結果キャッシュ（TTL）。
 * ダッシュボード／予算ページ間で year 単位の繰越入力を再利用する。
 */

type Entry<T> = { value: T; expiresAt: number }

const DEFAULT_TTL_MS = 5 * 60 * 1000

const store = new Map<string, Entry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    store.delete(key)
    return undefined
  }
  return e.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function spentYearCacheKey(userId: string, year: number, throughMonth: number): string {
  return `spent:${userId}:${year}:1-${throughMonth}`
}

export function totalBudgetYearCacheKey(userId: string, year: number): string {
  return `totalBudget:${userId}:${year}`
}
