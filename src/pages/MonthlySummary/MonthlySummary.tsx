import { useMemo, useState } from 'react'
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
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useUserName } from '../../hooks/useUserName'
import './MonthlySummary.css'

interface MonthlyData {
  year: number
  month: number
  total: number
  count: number
  categoryBreakdown: Record<string, number>
}

const MonthlySummary = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)
  const { expenses, loading: loadingExpenses } = useExpenses(user?.uid)

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
        })
      }

      const data = dataMap.get(key)!
      data.total += expense.amount || 0
      data.count += 1

      // カテゴリー別の集計
      const category = expense.bigCategory || '未分類'
      data.categoryBreakdown[category] = (data.categoryBreakdown[category] || 0) + (expense.amount || 0)
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
          <h2>月毎の支出</h2>
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
                          <h4>カテゴリー別内訳</h4>
                          {Object.keys(data.categoryBreakdown).length === 0 ? (
                            <p className="empty-message">カテゴリー別のデータがありません</p>
                          ) : (
                            <div className="chart-container">
                              <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={350}>
                                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <Pie
                                      data={prepareChartData(data.categoryBreakdown, data.total)}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={90}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {prepareChartData(data.categoryBreakdown, data.total).map(
                                        (_entry, index) => (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                          />
                                        )
                                      )}
                                    </Pie>
                                    <Tooltip
                                      content={<CustomTooltip />}
                                      cursor={{ fill: 'transparent' }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="chart-legend">
                                {prepareChartData(data.categoryBreakdown, data.total).map(
                                  (entry, index) => (
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
                                  )
                                )}
                              </div>
                            </div>
                          )}
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
        {!loadingExpenses && lineChartData.length > 0 && (
          <section className="monthly-summary-card line-chart-section">
            <h2>月別支出推移</h2>
            <div className="line-chart-container">
              <ResponsiveContainer width="100%" height={300}>
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
                    dot={{ fill: '#667eea', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default MonthlySummary

