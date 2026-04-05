import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useExpenses } from '../../hooks/useExpenses'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import './MonthlySummary.css'

interface MonthlyData {
  year: number
  month: number
  total: number
  count: number
  categoryBreakdown: Record<string, number>
  /** 複数タグは金額を等分して按分 */
  tagBreakdown: Record<string, number>
}

/** 折れ線（タグ）の初期表示件数（この順位から「タグなし」は含めない） */
const DEFAULT_LINE_TAG_COUNT = 5
const TAG_NONE_LABEL = 'タグなし'

function parseExpenseTags(tags: string): string[] {
  return tags.split(', ').map((t) => t.trim()).filter(Boolean)
}

const MonthlySummary = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)
  const { expenses, loading: loadingExpenses } = useExpenses(user?.uid)
  const { categories } = useCategories()
  const { allTags } = useTags()

  /** タグ名 → 紐づくカテゴリー名（支出検索のドロップダウンと一致させる） */
  const categoryNameByTagName = useMemo(() => {
    const map = new Map<string, string>()
    for (const tag of allTags) {
      const cat = categories.find((c) => c.id === tag.categoryId)
      if (cat) map.set(tag.name, cat.name)
    }
    return map
  }, [allTags, categories])

  // 月毎のデータを集計
  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, MonthlyData>()

    expenses.forEach((expense) => {
      if (!expense.date) return

      const expenseDate = expense.date.toDate()
      const year = expenseDate.getFullYear()
      const month = expenseDate.getMonth() + 1
      const key = `${year}-${month}`

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          year,
          month,
          total: 0,
          count: 0,
          categoryBreakdown: {},
          tagBreakdown: {},
        })
      }

      const data = dataMap.get(key)!
      const amount = expense.amount || 0
      data.total += amount
      data.count += 1

      const category = expense.bigCategory || '未分類'
      data.categoryBreakdown[category] = (data.categoryBreakdown[category] || 0) + amount

      const tagLabels = parseExpenseTags(expense.tags || '')
      if (tagLabels.length === 0) {
        const tk = TAG_NONE_LABEL
        data.tagBreakdown[tk] = (data.tagBreakdown[tk] || 0) + amount
      } else {
        const share = amount / tagLabels.length
        tagLabels.forEach((t) => {
          data.tagBreakdown[t] = (data.tagBreakdown[t] || 0) + share
        })
      }
    })

    // 配列に変換してソート（新しい順）
    return Array.from(dataMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  }, [expenses])

  // 全期間の合計
  const grandTotal = useMemo(() => {
    return monthlyData.reduce((sum, data) => sum + data.total, 0)
  }, [monthlyData])

  // 折れ線グラフ用のデータ（時系列順にソート）
  const lineChartData = useMemo(() => {
    return [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
      })
      .map((data) => ({
        month: `${data.year}/${String(data.month).padStart(2, '0')}`,
        amount: data.total,
        year: data.year,
        monthNum: data.month,
      }))
  }, [monthlyData])

  /** 円グラフ・折れ線の「カテゴリー / タグ」切り替え */
  const [chartGroupBy, setChartGroupBy] = useState<'category' | 'tag'>('category')

  /** 折れ線で選べるタグ一覧（全期間の合計が大きい順） */
  const availableTagsForLine = useMemo(() => {
    const tagTotals = new Map<string, number>()
    monthlyData.forEach((m) => {
      Object.entries(m.tagBreakdown).forEach(([t, v]) => {
        tagTotals.set(t, (tagTotals.get(t) || 0) + v)
      })
    })
    return Array.from(tagTotals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
      .map(([t]) => t)
  }, [monthlyData])

  /** 折れ線の既定「上位N件」用。金額順だがタグなしは対象外（一覧チェックボックスには残す） */
  const tagsForDefaultLineChart = useMemo(
    () => availableTagsForLine.filter((t) => t !== TAG_NONE_LABEL),
    [availableTagsForLine]
  )

  /**
   * 'default' … 上位 DEFAULT_LINE_TAG_COUNT 件を表示（タグなし除く）
   * 配列 … ユーザーがチェックで選んだタグ（空ならグラフなし）
   */
  const [selectedLineTagKeys, setSelectedLineTagKeys] = useState<string[] | 'default'>('default')

  const resolvedLineTags = useMemo(() => {
    if (availableTagsForLine.length === 0) return []
    if (selectedLineTagKeys === 'default') {
      return tagsForDefaultLineChart.slice(0, Math.min(DEFAULT_LINE_TAG_COUNT, tagsForDefaultLineChart.length))
    }
    return selectedLineTagKeys.filter((t) => availableTagsForLine.includes(t))
  }, [availableTagsForLine, selectedLineTagKeys, tagsForDefaultLineChart])

  useEffect(() => {
    setSelectedLineTagKeys((prev) => {
      if (prev === 'default') return prev
      const next = prev.filter((t) => availableTagsForLine.includes(t))
      if (next.length === 0 && availableTagsForLine.length > 0) return 'default'
      return next
    })
  }, [availableTagsForLine])

  const toggleLineTag = useCallback(
    (tag: string) => {
      setSelectedLineTagKeys((prev) => {
        const base =
          prev === 'default'
            ? tagsForDefaultLineChart.slice(0, Math.min(DEFAULT_LINE_TAG_COUNT, tagsForDefaultLineChart.length))
            : [...prev]
        const isOn = base.includes(tag)
        const next = isOn ? base.filter((t) => t !== tag) : [...base, tag]
        return next.sort(
          (a, b) => availableTagsForLine.indexOf(a) - availableTagsForLine.indexOf(b)
        )
      })
    },
    [availableTagsForLine, tagsForDefaultLineChart]
  )

  const resetLineTagsToDefaultTop = useCallback(() => {
    setSelectedLineTagKeys('default')
  }, [])

  /** チェックボックス一覧の絞り込み（タグ数が多いとき用） */
  const [lineTagFilterQuery, setLineTagFilterQuery] = useState('')

  const filteredTagsForPicker = useMemo(() => {
    const q = lineTagFilterQuery.trim()
    if (!q) return availableTagsForLine
    return availableTagsForLine.filter((t) => t.includes(q))
  }, [availableTagsForLine, lineTagFilterQuery])

  const lineChartTagRows = useMemo(() => {
    const sorted = [...monthlyData].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
    return sorted.map((m) => {
      const row: Record<string, string | number> = {
        month: `${m.year}/${String(m.month).padStart(2, '0')}`,
        year: m.year,
        monthNum: m.month,
      }
      resolvedLineTags.forEach((tag) => {
        row[tag] = m.tagBreakdown[tag] ?? 0
      })
      return row
    })
  }, [monthlyData, resolvedLineTags])

  // 選択された月の詳細データ
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  /** 支出検索（詳細）へ。タグ経由のときはマスタのカテゴリーも付与 */
  const goToExpenseDetail = (
    year: number,
    month: number,
    filter?: { category?: string; tag?: string }
  ) => {
    const q = new URLSearchParams({ year: String(year), month: String(month) })
    let categoryName = filter?.category
    if (filter?.tag && filter.tag !== TAG_NONE_LABEL && !categoryName) {
      categoryName = categoryNameByTagName.get(filter.tag)
    }
    if (categoryName) q.set('category', categoryName)
    if (filter?.tag) q.set('tag', filter.tag)
    navigate(`/monthly-expenses?${q.toString()}`)
  }

  const ChartGroupToggle = () => (
    <div className="chart-group-toggle" role="group" aria-label="グラフの分類">
      <button
        type="button"
        className={chartGroupBy === 'category' ? 'chart-group-toggle-btn active' : 'chart-group-toggle-btn'}
        onClick={() => setChartGroupBy('category')}
      >
        カテゴリー
      </button>
      <button
        type="button"
        className={chartGroupBy === 'tag' ? 'chart-group-toggle-btn active' : 'chart-group-toggle-btn'}
        onClick={() => setChartGroupBy('tag')}
      >
        タグ
      </button>
    </div>
  )

  const formatMonth = (year: number, month: number) => {
    return `${year}年${month}月`
  }

  // 円グラフ用の色パレット
  const COLORS = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#4facfe',
    '#00f2fe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#30cfd0',
    '#a8edea',
    '#fed6e3',
    '#ffecd2',
  ]

  // 円グラフ用のデータを準備
  const prepareChartData = (categoryBreakdown: Record<string, number>, total: number) => {
    return Object.entries(categoryBreakdown)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value)
  }

  // カスタムツールチップ
  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      name: string
      value: number
      payload: {
        name: string
        value: number
        percentage: string
      }
    }>
    coordinate?: {
      x: number
      y: number
    }
  }

  const CustomTooltip = ({ active, payload, coordinate }: TooltipProps) => {
    if (active && payload && payload.length > 0 && coordinate) {
      // グラフの中心上部に表示（グラフの高さは350px、マージン20px、円の中心は50%）
      const chartCenterX = coordinate.x
      const chartTop = 20 // マージン分
      
      return (
        <div
          className="chart-tooltip"
          style={{
            position: 'absolute',
            left: `${chartCenterX}px`,
            top: `${chartTop}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <p className="chart-tooltip-label">{payload[0].name}</p>
          <p className="chart-tooltip-value">
            ¥{payload[0].value.toLocaleString()} ({payload[0].payload.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }



  return (
    <div className="monthly-summary-page">
      <header className="monthly-summary-header">
        <div className="monthly-summary-header-left">
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
            aria-label="ダッシュボードに戻る"
          >
            ← ダッシュボード
          </button>
          <h1>月毎のサマリー</h1>
        </div>
        <div className="monthly-summary-user-info">
          <span className="monthly-summary-user-name">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <Link to="/category-tag-management" className="management-link">
            カテゴリー・タグ管理
          </Link>
          <button className="monthly-summary-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="monthly-summary-content">
        {/* 全体サマリー */}
        <section className="monthly-summary-card total-summary-section">
          <h2>全体サマリー</h2>
          {loadingExpenses ? (
            <p className="loading-text">読み込み中...</p>
          ) : (
            <div className="total-summary-stats">
              <div className="total-amount">
                <span className="total-amount-value">¥{grandTotal.toLocaleString()}</span>
                <p className="total-amount-label">全期間の合計金額</p>
              </div>
              <div className="total-count">
                <span className="total-count-value">{monthlyData.length}</span>
                <p className="total-count-label">月数</p>
              </div>
            </div>
          )}
        </section>

        {/* 月毎の一覧 */}
        <section className="monthly-summary-card monthly-list-section">
          <div className="monthly-section-heading">
            <h2>月毎の支出</h2>
            <ChartGroupToggle />
          </div>
          {loadingExpenses ? (
            <p className="loading-text">読み込み中...</p>
          ) : monthlyData.length === 0 ? (
            <p className="empty-message">支出データがありません。</p>
          ) : (
            <div className="monthly-list">
              {monthlyData.map((data) => {
                const monthKey = `${data.year}-${data.month}`
                const isExpanded = selectedMonth === monthKey

                return (
                  <div key={monthKey} className="monthly-item">
                    <button
                      className="monthly-item-header"
                      onClick={() => setSelectedMonth(isExpanded ? null : monthKey)}
                      type="button"
                    >
                      <div className="monthly-item-info">
                        <h3>{formatMonth(data.year, data.month)}</h3>
                        <div className="monthly-item-stats">
                          <span className="monthly-item-amount">¥{data.total.toLocaleString()}</span>
                          <span className="monthly-item-count">{data.count}件</span>
                        </div>
                      </div>
                      <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                    </button>

                    {isExpanded && (
                      <div className="monthly-item-details">
                        <div className="category-breakdown">
                          <h4>
                            {chartGroupBy === 'category' ? 'カテゴリー別内訳' : 'タグ別内訳'}
                          </h4>
                          {(() => {
                            const breakdown =
                              chartGroupBy === 'category'
                                ? data.categoryBreakdown
                                : data.tagBreakdown
                            const chartRows = prepareChartData(breakdown, data.total)
                            return Object.keys(breakdown).length === 0 || chartRows.length === 0 ? (
                              <p className="empty-message">
                                {chartGroupBy === 'category'
                                  ? 'カテゴリー別のデータがありません'
                                  : 'タグ別のデータがありません'}
                              </p>
                            ) : (
                              <div className="chart-container">
                                <div className="chart-wrapper">
                                  <ResponsiveContainer width="100%" height={350}>
                                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                      <Pie
                                        data={chartRows}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(slice) => {
                                          const name =
                                            slice &&
                                            typeof slice === 'object' &&
                                            'name' in slice &&
                                            typeof (slice as { name?: unknown }).name === 'string'
                                              ? (slice as { name: string }).name
                                              : null
                                          if (!name) return
                                          if (chartGroupBy === 'category') {
                                            goToExpenseDetail(data.year, data.month, {
                                              category: name,
                                            })
                                          } else {
                                            goToExpenseDetail(data.year, data.month, { tag: name })
                                          }
                                        }}
                                      >
                                        {chartRows.map((_entry, index) => (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                          />
                                        ))}
                                      </Pie>
                                      <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'transparent' }}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="chart-legend">
                                  {chartRows.map((entry, index) => (
                                    <div key={index} className="legend-item">
                                      <span
                                        className="legend-color"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                      />
                                      <span className="legend-label">{entry.name}</span>
                                      <span className="legend-value">
                                        ¥{entry.value.toLocaleString()} ({entry.percentage}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                        <div className="monthly-item-actions">
                          <Link
                            to={`/monthly-expenses?year=${data.year}&month=${data.month}`}
                            className="view-details-link"
                          >
                            詳細を見る →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 月別支出推移グラフ */}
        {!loadingExpenses && monthlyData.length > 0 && (
          <section className="monthly-summary-card line-chart-section">
            <div className="monthly-section-heading">
              <h2>
                {chartGroupBy === 'category' ? '月別支出推移' : '月別支出推移（タグ別）'}
              </h2>
              <ChartGroupToggle />
            </div>
            <div
              className={
                chartGroupBy === 'tag' ? 'line-chart-container line-chart-container--with-legend' : 'line-chart-container'
              }
            >
              {chartGroupBy === 'category' && lineChartData.length === 0 ? (
                <p className="empty-message">表示できるデータがありません</p>
              ) : chartGroupBy === 'tag' && availableTagsForLine.length === 0 ? (
                <p className="empty-message">タグ別の推移を表示するデータがありません</p>
              ) : chartGroupBy === 'tag' && resolvedLineTags.length === 0 ? (
                <p className="empty-message">表示するタグを1件以上選んでください</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartGroupBy === 'category' ? (
                    <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        style={{ fontSize: '0.75rem' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '0.75rem' }}
                        tickFormatter={(value: number) => {
                          if (value >= 10000) {
                            return `¥${(value / 10000).toFixed(0)}万`
                          }
                          return `¥${value.toLocaleString()}`
                        }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          color: '#0f172a',
                        }}
                        formatter={(value: number | undefined) => {
                          if (value === undefined) return ['', '支出']
                          return [`¥${value.toLocaleString()}`, '支出']
                        }}
                        labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#667eea"
                        strokeWidth={2}
                        name="合計"
                        dot={(props: {
                          cx?: number
                          cy?: number
                          payload?: { year: number; monthNum: number }
                        }) => {
                          const { cx, cy, payload } = props
                          if (cx == null || cy == null || !payload) return null
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill="#667eea"
                              style={{ cursor: 'pointer' }}
                              aria-label={`${payload.year}年${payload.monthNum}月の詳細を開く`}
                              onClick={(e) => {
                                e.stopPropagation()
                                goToExpenseDetail(payload.year, payload.monthNum)
                              }}
                            />
                          )
                        }}
                        activeDot={(props: {
                          cx?: number
                          cy?: number
                          payload?: { year: number; monthNum: number }
                        }) => {
                          const { cx, cy, payload } = props
                          if (cx == null || cy == null || !payload) return null
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#667eea"
                              style={{ cursor: 'pointer' }}
                              aria-label={`${payload.year}年${payload.monthNum}月の詳細を開く`}
                              onClick={(e) => {
                                e.stopPropagation()
                                goToExpenseDetail(payload.year, payload.monthNum)
                              }}
                            />
                          )
                        }}
                      />
                    </LineChart>
                  ) : (
                    <LineChart data={lineChartTagRows} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        style={{ fontSize: '0.75rem' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '0.75rem' }}
                        tickFormatter={(value: number) => {
                          if (value >= 10000) {
                            return `¥${(value / 10000).toFixed(0)}万`
                          }
                          return `¥${value.toLocaleString()}`
                        }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          color: '#0f172a',
                        }}
                        formatter={(value: number | undefined, name: string | undefined) => {
                          if (value === undefined) return ['', name ?? '']
                          return [`¥${value.toLocaleString()}`, name ?? '']
                        }}
                        labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '0.5rem', fontSize: '0.75rem', color: '#334155' }} />
                      {resolvedLineTags.map((tagName, tagIndex) => (
                        <Line
                          key={tagName}
                          type="monotone"
                          dataKey={tagName}
                          stroke={COLORS[tagIndex % COLORS.length]}
                          strokeWidth={2}
                          dot={(props: {
                            cx?: number
                            cy?: number
                            payload?: Record<string, string | number>
                          }) => {
                            const { cx, cy, payload } = props
                            if (cx == null || cy == null || !payload) return null
                            const year = payload.year as number
                            const monthNum = payload.monthNum as number
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={COLORS[tagIndex % COLORS.length]}
                                style={{ cursor: 'pointer' }}
                                aria-label={`${year}年${monthNum}月・${tagName}の詳細を開く`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToExpenseDetail(year, monthNum, { tag: tagName })
                                }}
                              />
                            )
                          }}
                          activeDot={(props: {
                            cx?: number
                            cy?: number
                            payload?: Record<string, string | number>
                          }) => {
                            const { cx, cy, payload } = props
                            if (cx == null || cy == null || !payload) return null
                            const year = payload.year as number
                            const monthNum = payload.monthNum as number
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill={COLORS[tagIndex % COLORS.length]}
                                style={{ cursor: 'pointer' }}
                                aria-label={`${year}年${monthNum}月・${tagName}の詳細を開く`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToExpenseDetail(year, monthNum, { tag: tagName })
                                }}
                              />
                            )
                          }}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
            {chartGroupBy === 'tag' && availableTagsForLine.length > 0 && (
              <div className="line-chart-tag-picker">
                <fieldset className="line-chart-tag-picker-fieldset">
                  <legend className="line-chart-tag-picker-legend">表示するタグ</legend>
                  <p className="line-chart-tag-picker-hint">
                    {selectedLineTagKeys === 'default'
                      ? `既定は金額合計の大きいタグから${DEFAULT_LINE_TAG_COUNT}件です（「${TAG_NONE_LABEL}」は除きます）。チェックで追加・解除できます。`
                      : 'チェックを外すとその系列が非表示になります。'}
                  </p>
                  <div className="line-chart-tag-picker-toolbar">
                    <label className="line-chart-tag-filter-wrap" htmlFor="line-tag-filter-input">
                      <span className="line-chart-tag-filter-sr-label">タグ名で絞り込み</span>
                      <input
                        id="line-tag-filter-input"
                        type="search"
                        className="line-chart-tag-filter-input"
                        placeholder="タグ名で絞り込み…"
                        value={lineTagFilterQuery}
                        onChange={(e) => setLineTagFilterQuery(e.target.value)}
                        autoComplete="off"
                        enterKeyHint="search"
                      />
                    </label>
                    {lineTagFilterQuery.trim() !== '' && (
                      <button
                        type="button"
                        className="line-chart-tag-filter-clear"
                        onClick={() => setLineTagFilterQuery('')}
                      >
                        絞り込みをクリア
                      </button>
                    )}
                    <button
                      type="button"
                      className="line-chart-tag-picker-reset"
                      onClick={resetLineTagsToDefaultTop}
                    >
                      上位{DEFAULT_LINE_TAG_COUNT}件に戻す
                    </button>
                  </div>
                  <p className="line-chart-tag-picker-count" aria-live="polite">
                    {lineTagFilterQuery.trim() !== ''
                      ? `表示中 ${filteredTagsForPicker.length}件 / 全${availableTagsForLine.length}件`
                      : `全${availableTagsForLine.length}件`}
                  </p>
                  <div className="line-chart-tag-checkboxes-scroll">
                    {filteredTagsForPicker.length === 0 ? (
                      <p className="line-chart-tag-filter-empty">一致するタグがありません</p>
                    ) : (
                      <div className="line-chart-tag-checkboxes" role="group" aria-label="表示するタグの選択">
                        {filteredTagsForPicker.map((tag) => (
                          <label key={tag} className="line-chart-tag-checkbox-label">
                            <input
                              type="checkbox"
                              checked={resolvedLineTags.includes(tag)}
                              onChange={() => toggleLineTag(tag)}
                            />
                            <span className="line-chart-tag-checkbox-text" title={tag}>
                              {tag}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </fieldset>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default MonthlySummary

