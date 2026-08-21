import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCurrentYearMonth } from '../../hooks/useDashboardExpenses'
import { categoryService } from '../../services/categoryService'
import { tagService } from '../../services/tagService'
import {
  listBudgetsForYear,
  listBudgetsForMonth,
  listTotalBudgetLimitsForYear,
  setBudget,
  deleteBudget,
} from '../../services/budgetService'
import { expenseService } from '../../services/expenseService'
import { incomeService } from '../../services/incomeService'
import { previousCalendarMonth } from '../../utils/budgetMonth'
import {
  buildYearMonthBudgetSpent,
  computeCarryoverChain,
  formatCarryoverYen,
  type MonthCarryover,
} from '../../utils/budgetCarryover'
import type { Category, Tag } from '../../types'
import './Budget.css'

function parseYear(searchParams: URLSearchParams): number {
  const cur = getCurrentYearMonth()
  const y = Number(searchParams.get('year'))
  return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : cur.year
}

/** URL の month は詳細パネルの初期選択に使う（任意） */
function parseOptionalMonth(searchParams: URLSearchParams): number | null {
  const m = Number(searchParams.get('month'))
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : null
}

/** 空欄は null。不正な入力は 'invalid' */
function parseOptionalAmount(s: string): number | null | 'invalid' {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 'invalid'
  return n
}

function emptyMonthTotals(): Record<number, string> {
  const o: Record<number, string> = {}
  for (let m = 1; m <= 12; m++) o[m] = ''
  return o
}

const Budget = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const year = useMemo(() => parseYear(searchParams), [searchParams])
  const initialDetailMonth = useMemo(() => parseOptionalMonth(searchParams), [searchParams])

  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [monthTotals, setMonthTotals] = useState<Record<number, string>>(emptyMonthTotals)
  /** 読み込み時点で DB に存在した全体予算の月（空欄保存時の削除判定用） */
  const [savedTotalMonths, setSavedTotalMonths] = useState<Set<number>>(new Set())
  const [detailMonth, setDetailMonth] = useState<number | null>(initialDetailMonth)
  const [categoryRows, setCategoryRows] = useState<Array<{ categoryId: string; amount: string }>>([])
  const [tagRows, setTagRows] = useState<Array<{ tagId: string; amount: string }>>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [spentByMonth, setSpentByMonth] = useState<Record<number, number>>({})
  const [incomeByMonth, setIncomeByMonth] = useState<Record<number, number>>({})
  const [initialCarryIn, setInitialCarryIn] = useState(0)

  const loadYearTotals = useCallback(async () => {
    if (!user?.uid) return
    setLoading(true)
    setLoadError(null)
    setSaveOk(false)
    try {
      const [totalLimits, spent, income, prevBudgetMap, prevSpent, prevIncome] = await Promise.all([
        listTotalBudgetLimitsForYear(user.uid, year),
        expenseService.getSpentByMonthForYear(user.uid, year, 12),
        incomeService.getIncomeByMonthForYear(user.uid, year, 12),
        listTotalBudgetLimitsForYear(user.uid, year - 1),
        expenseService.getSpentByMonthForYear(user.uid, year - 1, 12),
        incomeService.getIncomeByMonthForYear(user.uid, year - 1, 12),
      ])
      const savedMonths = new Set<number>()
      for (let m = 1; m <= 12; m++) {
        if (totalLimits[m] != null) savedMonths.add(m)
      }
      setSavedTotalMonths(savedMonths)
      setSpentByMonth(spent)
      setIncomeByMonth(income)

      const prevChain = computeCarryoverChain(
        buildYearMonthBudgetSpent(year - 1, prevBudgetMap, prevSpent, prevIncome),
        0
      )
      setInitialCarryIn(prevChain[11]?.carryOut ?? 0)

      const next = emptyMonthTotals()
      for (let m = 1; m <= 12; m++) {
        const limit = totalLimits[m]
        if (limit != null) next[m] = String(limit)
      }
      setMonthTotals(next)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [user?.uid, year])

  const loadDetailForMonth = useCallback(
    async (month: number) => {
      if (!user?.uid) return
      setDetailLoading(true)
      setLoadError(null)
      try {
        const prev = previousCalendarMonth(year, month)
        const [cur, prevList] = await Promise.all([
          listBudgetsForMonth(user.uid, year, month),
          listBudgetsForMonth(user.uid, prev.year, prev.month),
        ])

        const curCats = cur.filter((b) => b.categoryId && !b.tagId)
        const prevCats = prevList.filter((b) => b.categoryId && !b.tagId)
        const catIdSet = new Set<string>([
          ...curCats.map((b) => b.categoryId!),
          ...prevCats.map((b) => b.categoryId!),
        ])
        setCategoryRows(
          Array.from(catIdSet).map((id) => {
            const c = curCats.find((x) => x.categoryId === id)
            const p = prevCats.find((x) => x.categoryId === id)
            const amt = c?.amountLimit ?? p?.amountLimit
            return { categoryId: id, amount: amt != null ? String(amt) : '' }
          })
        )

        const curT = cur.filter((b) => b.tagId)
        const prevT = prevList.filter((b) => b.tagId)
        const tagIdSet = new Set<string>([...curT.map((b) => b.tagId!), ...prevT.map((b) => b.tagId!)])
        setTagRows(
          Array.from(tagIdSet).map((id) => {
            const c = curT.find((x) => x.tagId === id)
            const p = prevT.find((x) => x.tagId === id)
            const amt = c?.amountLimit ?? p?.amountLimit
            return { tagId: id, amount: amt != null ? String(amt) : '' }
          })
        )
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : '詳細の読み込みに失敗しました')
      } finally {
        setDetailLoading(false)
      }
    },
    [user?.uid, year]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cats, tgs] = await Promise.all([
          categoryService.getAllCategories(),
          tagService.getAllTags(),
        ])
        if (!cancelled) {
          setCategories(cats)
          setTags(tgs)
        }
      } catch {
        if (!cancelled) setLoadError('マスタの取得に失敗しました')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadYearTotals()
  }, [loadYearTotals])

  useEffect(() => {
    setDetailMonth(initialDetailMonth)
  }, [year, initialDetailMonth])

  useEffect(() => {
    if (detailMonth == null) {
      setCategoryRows([])
      setTagRows([])
      return
    }
    void loadDetailForMonth(detailMonth)
  }, [detailMonth, loadDetailForMonth])

  const setYear = (y: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('year', String(y))
    if (detailMonth != null) {
      next.set('month', String(detailMonth))
    } else {
      next.delete('month')
    }
    setSearchParams(next, { replace: true })
  }

  const openDetail = (month: number) => {
    setDetailMonth(month)
    const next = new URLSearchParams(searchParams)
    next.set('year', String(year))
    next.set('month', String(month))
    setSearchParams(next, { replace: true })
  }

  const closeDetail = () => {
    setDetailMonth(null)
    const next = new URLSearchParams(searchParams)
    next.set('year', String(year))
    next.delete('month')
    setSearchParams(next, { replace: true })
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? id

  const yearTotalSum = useMemo(() => {
    let sum = 0
    let count = 0
    for (let m = 1; m <= 12; m++) {
      const n = parseOptionalAmount(monthTotals[m] ?? '')
      if (typeof n === 'number') {
        sum += n
        count += 1
      }
    }
    return { sum, count }
  }, [monthTotals])

  const carryoverByMonth = useMemo(() => {
    const budgetByMonth: Record<number, number | null> = {}
    for (let m = 1; m <= 12; m++) {
      const parsed = parseOptionalAmount(monthTotals[m] ?? '')
      budgetByMonth[m] = typeof parsed === 'number' ? parsed : null
    }
    const chain = computeCarryoverChain(
      buildYearMonthBudgetSpent(year, budgetByMonth, spentByMonth, incomeByMonth),
      initialCarryIn
    )
    const map: Record<number, MonthCarryover> = {}
    for (const row of chain) {
      map[row.month] = row
    }
    return map
  }, [year, monthTotals, spentByMonth, incomeByMonth, initialCarryIn])

  const applyBulkToEmpty = () => {
    const n = parseOptionalAmount(bulkAmount)
    if (n === 'invalid' || n === null) {
      setSaveError('一括入力は0以上の整数を指定してください')
      return
    }
    setSaveError(null)
    setMonthTotals((prev) => {
      const next = { ...prev }
      for (let m = 1; m <= 12; m++) {
        if (next[m].trim() === '') next[m] = String(n)
      }
      return next
    })
  }

  const applyBulkToAll = () => {
    const n = parseOptionalAmount(bulkAmount)
    if (n === 'invalid' || n === null) {
      setSaveError('一括入力は0以上の整数を指定してください')
      return
    }
    setSaveError(null)
    const next = emptyMonthTotals()
    for (let m = 1; m <= 12; m++) next[m] = String(n)
    setMonthTotals(next)
  }

  /**
   * 一括入力額を「今月以降」の月に適用（表示中の年のみ）。
   * - 表示年 === 今年 → 今月〜12月
   * - 表示年 > 今年 → 1〜12月（その年の全月）
   * - 表示年 < 今年 → 適用不可
   */
  const applyBulkFromThisMonthOnward = () => {
    const n = parseOptionalAmount(bulkAmount)
    if (n === 'invalid' || n === null) {
      setSaveError('一括入力は0以上の整数を指定してください')
      return
    }
    const cur = getCurrentYearMonth()
    if (year < cur.year) {
      setSaveError('過去の年には「今月以降に適用」できません')
      return
    }
    const fromMonth = year === cur.year ? cur.month : 1
    setSaveError(null)
    setMonthTotals((prev) => {
      const next = { ...prev }
      for (let m = fromMonth; m <= 12; m++) {
        next[m] = String(n)
      }
      return next
    })
  }

  /** 表示中の年の予算（全体・カテゴリー・タグ）をすべて削除 */
  const deleteAllYearBudgets = async () => {
    if (!user?.uid) return
    const ok = window.confirm(
      `${year}年の予算（全体・カテゴリー別・タグ別）をすべて削除します。よろしいですか？`
    )
    if (!ok) return

    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const list = await listBudgetsForYear(user.uid, year)
      for (const b of list) {
        if (b.tagId) {
          await deleteBudget(user.uid, b.year, b.month, { tagId: b.tagId })
        } else if (b.categoryId) {
          await deleteBudget(user.uid, b.year, b.month, { categoryId: b.categoryId })
        } else {
          await deleteBudget(user.uid, b.year, b.month)
        }
      }
      closeDetail()
      setSaveOk(true)
      await loadYearTotals()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '全予算の削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!user?.uid) return
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      for (let m = 1; m <= 12; m++) {
        const parsed = parseOptionalAmount(monthTotals[m] ?? '')
        if (parsed === 'invalid') {
          setSaveError(`${m}月の全体予算は空欄か、0以上の整数を入力してください`)
          setSaving(false)
          return
        }
        if (parsed === null) {
          if (savedTotalMonths.has(m)) {
            await deleteBudget(user.uid, year, m)
          }
        } else {
          await setBudget(user.uid, year, m, parsed)
        }
      }

      if (detailMonth != null) {
        const curList = await listBudgetsForMonth(user.uid, year, detailMonth)
        const curCatIds = new Set(curList.filter((b) => b.categoryId && !b.tagId).map((b) => b.categoryId!))
        const desiredCatIds = new Set(categoryRows.filter((r) => r.categoryId).map((r) => r.categoryId))
        for (const id of curCatIds) {
          if (!desiredCatIds.has(id)) {
            await deleteBudget(user.uid, year, detailMonth, { categoryId: id })
          }
        }
        for (const row of categoryRows) {
          if (!row.categoryId) continue
          const n = parseOptionalAmount(row.amount)
          if (n === 'invalid') {
            setSaveError('カテゴリー別予算は0以上の整数で入力してください')
            setSaving(false)
            return
          }
          if (n === null) {
            if (curCatIds.has(row.categoryId)) {
              await deleteBudget(user.uid, year, detailMonth, { categoryId: row.categoryId })
            }
            continue
          }
          await setBudget(user.uid, year, detailMonth, n, {
            categoryId: row.categoryId,
            categoryName: categoryName(row.categoryId),
          })
        }

        const curTagIds = new Set(curList.filter((b) => b.tagId).map((b) => b.tagId!))
        const desiredTagIds = new Set(tagRows.filter((r) => r.tagId).map((r) => r.tagId))
        for (const id of curTagIds) {
          if (!desiredTagIds.has(id)) {
            await deleteBudget(user.uid, year, detailMonth, { tagId: id })
          }
        }
        for (const row of tagRows) {
          if (!row.tagId) continue
          const n = parseOptionalAmount(row.amount)
          if (n === 'invalid') {
            setSaveError('タグ別予算は0以上の整数で入力してください')
            setSaving(false)
            return
          }
          if (n === null) {
            if (curTagIds.has(row.tagId)) {
              await deleteBudget(user.uid, year, detailMonth, { tagId: row.tagId })
            }
            continue
          }
          await setBudget(user.uid, year, detailMonth, n, {
            tagId: row.tagId,
            tagName: tagName(row.tagId),
          })
        }
      }

      navigate('/dashboard', { replace: true })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const yearOptions = useMemo(() => {
    const ys = new Set<number>()
    for (let y = year - 3; y <= year + 1; y++) ys.add(y)
    ys.add(getCurrentYearMonth().year)
    return Array.from(ys).sort((a, b) => a - b)
  }, [year])

  return (
    <div className="budget-page">
      <header className="budget-header">
        <h1>予算</h1>
        <div className="budget-header-actions">
          <Link to="/dashboard" className="budget-link-dashboard">
            ダッシュボードへ
          </Link>
        </div>
      </header>

      <main className="budget-main">
        <section className="budget-card">
          <h2>対象の年</h2>
          <div className="budget-ym-picker" role="group" aria-label="予算を設定する年">
            <label>
              年
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="budget-select"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="budget-hint">
            {year}年の1〜12月の全体予算を一覧で確認・編集できます。繰越は「予算＋前月繰入−実績」で、超過や予算未設定月の支出はマイナスとして翌月へ引き継ぎます。
          </p>
        </section>

        {loadError && (
          <p className="budget-error" role="alert">
            {loadError}
          </p>
        )}

        {loading ? (
          <p className="budget-loading">読み込み中…</p>
        ) : (
          <>
            <section className="budget-card">
              <div className="budget-section-head">
                <h2>{year}年の月次予算（全体）</h2>
                <p className="budget-year-sum" aria-live="polite">
                  入力 {yearTotalSum.count} か月 · 合計 ¥{yearTotalSum.sum.toLocaleString()}
                </p>
              </div>

              <div className="budget-bulk">
                <label className="budget-field budget-bulk-field">
                  <span className="budget-label">一括入力（円）</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="budget-input budget-input--narrow"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="例: 150000"
                  />
                </label>
                <div className="budget-bulk-actions">
                  <button type="button" className="budget-add-row" onClick={applyBulkToEmpty}>
                    空の月に適用
                  </button>
                  <button type="button" className="budget-add-row" onClick={applyBulkToAll}>
                    全年月に適用
                  </button>
                  <button
                    type="button"
                    className="budget-add-row"
                    onClick={applyBulkFromThisMonthOnward}
                  >
                    今月以降に適用
                  </button>
                  <button
                    type="button"
                    className="budget-danger-btn"
                    disabled={saving}
                    onClick={() => void deleteAllYearBudgets()}
                  >
                    全予算削除
                  </button>
                </div>
              </div>

              <div className="budget-year-table-wrap">
                <table className="budget-year-table">
                  <thead>
                    <tr>
                      <th scope="col">月</th>
                      <th scope="col">全体予算</th>
                      <th scope="col">収入</th>
                      <th scope="col">実績</th>
                      <th scope="col">繰入</th>
                      <th scope="col">有効予算</th>
                      <th scope="col">繰越</th>
                      <th scope="col">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const co = carryoverByMonth[m]
                      return (
                        <tr
                          key={m}
                          className={detailMonth === m ? 'budget-year-row--active' : undefined}
                        >
                          <th scope="row">{m}月</th>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              className="budget-input budget-input--table"
                              value={monthTotals[m] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setMonthTotals((prev) => ({ ...prev, [m]: v }))
                              }}
                              aria-label={`${m}月の全体予算`}
                              placeholder="未設定"
                            />
                          </td>
                          <td className="budget-num">
                            ¥{(co?.income ?? incomeByMonth[m] ?? 0).toLocaleString()}
                          </td>
                          <td className="budget-num">
                            ¥{(co?.spent ?? spentByMonth[m] ?? 0).toLocaleString()}
                          </td>
                          <td
                            className={`budget-num${co != null && co.carryIn < 0 ? ' budget-num--over' : ''}`}
                          >
                            {co ? formatCarryoverYen(co.carryIn) : '—'}
                          </td>
                          <td
                            className={`budget-num${co != null && co.available < 0 ? ' budget-num--over' : ''}`}
                          >
                            {co ? formatCarryoverYen(co.available) : '—'}
                          </td>
                          <td
                            className={`budget-num${co != null && co.carryOut < 0 ? ' budget-num--over' : ''}`}
                          >
                            {co ? formatCarryoverYen(co.carryOut) : '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="budget-detail-toggle"
                              onClick={() => (detailMonth === m ? closeDetail() : openDetail(m))}
                              aria-expanded={detailMonth === m}
                            >
                              {detailMonth === m ? '閉じる' : '詳細'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="budget-field-hint">
                空欄にして保存すると、その月の全体予算を削除します。繰越列は入力中の予算と実績から都度再計算されます（保存前でも反映）。
              </p>
            </section>

            {detailMonth != null && (
              <section className="budget-card" aria-labelledby="budget-detail-heading">
                <div className="budget-section-head">
                  <h2 id="budget-detail-heading">
                    {year}年{detailMonth}月のカテゴリー・タグ別
                  </h2>
                  <button type="button" className="budget-add-row" onClick={closeDetail}>
                    閉じる
                  </button>
                </div>

                {detailLoading ? (
                  <p className="budget-loading">詳細を読み込み中…</p>
                ) : (
                  <>
                    <div className="budget-detail-block">
                      <div className="budget-section-head">
                        <h3 className="budget-subheading">カテゴリー別</h3>
                        <button
                          type="button"
                          className="budget-add-row"
                          onClick={() =>
                            setCategoryRows((rows) => [...rows, { categoryId: '', amount: '' }])
                          }
                        >
                          行を追加
                        </button>
                      </div>
                      <ul className="budget-row-list">
                        {categoryRows.map((row, index) => (
                          <li key={`${row.categoryId || 'new'}-${index}`} className="budget-row">
                            <select
                              className="budget-select budget-select--grow"
                              value={row.categoryId}
                              onChange={(e) => {
                                const v = e.target.value
                                setCategoryRows((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, categoryId: v } : r))
                                )
                              }}
                            >
                              <option value="">カテゴリーを選択</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="budget-input budget-input--narrow"
                              placeholder="円"
                              value={row.amount}
                              onChange={(e) => {
                                const v = e.target.value
                                setCategoryRows((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, amount: v } : r))
                                )
                              }}
                            />
                            <button
                              type="button"
                              className="budget-remove-row"
                              onClick={() =>
                                setCategoryRows((rows) => rows.filter((_, i) => i !== index))
                              }
                              aria-label="この行を削除"
                            >
                              削除
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="budget-detail-block">
                      <div className="budget-section-head">
                        <h3 className="budget-subheading">タグ別</h3>
                        <button
                          type="button"
                          className="budget-add-row"
                          onClick={() => setTagRows((rows) => [...rows, { tagId: '', amount: '' }])}
                        >
                          行を追加
                        </button>
                      </div>
                      <ul className="budget-row-list">
                        {tagRows.map((row, index) => (
                          <li key={`${row.tagId || 'new'}-${index}`} className="budget-row">
                            <select
                              className="budget-select budget-select--grow"
                              value={row.tagId}
                              onChange={(e) => {
                                const v = e.target.value
                                setTagRows((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, tagId: v } : r))
                                )
                              }}
                            >
                              <option value="">タグを選択</option>
                              {tags.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="budget-input budget-input--narrow"
                              placeholder="円"
                              value={row.amount}
                              onChange={(e) => {
                                const v = e.target.value
                                setTagRows((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, amount: v } : r))
                                )
                              }}
                            />
                            <button
                              type="button"
                              className="budget-remove-row"
                              onClick={() => setTagRows((rows) => rows.filter((_, i) => i !== index))}
                              aria-label="この行を削除"
                            >
                              削除
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </section>
            )}

            <div className="budget-save-bar">
              {saveError && (
                <p className="budget-error" role="alert">
                  {saveError}
                </p>
              )}
              {saveOk && (
                <p className="budget-success" role="status">
                  保存しました。
                </p>
              )}
              <button type="button" className="budget-save" disabled={saving} onClick={() => void handleSave()}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Budget
