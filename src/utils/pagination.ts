/** ページ番号ボタン用。連続しない区間は 'ellipsis' で省略表示する。 */
export function buildPaginationItems(
  current: number,
  total: number
): Array<number | 'ellipsis'> {
  if (total <= 1) return [1]
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const set = new Set<number>()
  set.add(1)
  set.add(total)
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) set.add(p)
  }

  const sorted = [...set].sort((a, b) => a - b)
  const out: Array<number | 'ellipsis'> = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push('ellipsis')
    }
    out.push(sorted[i])
  }

  return out
}
