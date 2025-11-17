import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import './Dashboard.css'

// Expense型の定義
interface Expense {
  id: string
  date: Timestamp
  amount: number
  userId: string
  bigCategory: string
  tags: string
  paymentMethod: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ログイン後に表示されるダッシュボード画面
const Dashboard = () => {
  // 認証済みユーザー情報とログアウト関数を取得
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loadingName, setLoadingName] = useState<boolean>(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(true)

  // ログアウトボタン押下時にサインアウトし、ログイン画面へ戻す
  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  // Firestore の users コレクションからユーザー名を取得
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.uid) {
        setDisplayName(null)
        setLoadingName(false)
        return
      }
      try {
        // Firestore の users/{uid} ドキュメントからプロフィールを取得
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)
        if (!snap.exists()) {
          // ユーザードキュメントが存在しない場合は警告を出し、Auth の displayName にフォールバック
          console.warn('[Dashboard] users document not found for uid:', user.uid)
          setDisplayName(user.displayName ?? null)
        } else {
          // ドキュメントの name フィールドを読み取り、空文字は未設定として扱う
          const data = snap.data() as { name?: string } | undefined
          const name = (data?.name ?? '').trim()
          // name が未設定なら Auth の displayName にフォールバック
          setDisplayName(name !== '' ? name : user.displayName ?? null)
        }
      } catch (e) {
        // Firestore 読み取り失敗（権限不足など）の場合はエラーログを出し、表示名は未設定にする
        console.error('Failed to load user profile', e)
        setDisplayName(null)
      } finally {
        // ローディング状態の解除
        setLoadingName(false)
      }
    }
    fetchUserName()
  }, [user?.uid])

  // Firestore の expenses コレクションから支出データを取得
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!user?.uid) {
        setExpenses([])
        setLoadingExpenses(false)
        return
      }
      try {
        // ユーザーIDでフィルタリングしてexpensesを取得
        const expensesRef = collection(db, 'expenses')
        const q = query(expensesRef, where('userId', '==', user.uid))
        const querySnapshot = await getDocs(q)
        
        const expensesData: Expense[] = []
        querySnapshot.forEach((doc) => {
          expensesData.push({
            id: doc.id,
            ...doc.data(),
          } as Expense)
        })
        
        // 日付でソート（新しい順）
        expensesData.sort((a, b) => {
          const dateA = a.date?.toMillis() || 0
          const dateB = b.date?.toMillis() || 0
          return dateB - dateA
        })
        
        setExpenses(expensesData)
      } catch (e) {
        console.error('Failed to load expenses', e)
        setExpenses([])
      } finally {
        setLoadingExpenses(false)
      }
    }
    fetchExpenses()
  }, [user?.uid])

  // タイムスタンプを日付文字列に変換
  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '-'
    const date = timestamp.toDate()
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // タイムスタンプを日時文字列に変換
  const formatDateTime = (timestamp: Timestamp | undefined): string => {
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

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-user-email">
            {loadingName ? '読み込み中…' : displayName ?? 'ゲスト'}
          </span>
          <button className="dashboard-signout-button" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-card welcome-section">
          <h2>ようこそ</h2>
          <p>ここに家計管理の概要やウィジェットを配置できます。</p>
        </section>

        <section className="dashboard-card expenses-section">
          <h2>支出一覧</h2>
          {loadingExpenses ? (
            <p>読み込み中…</p>
          ) : expenses.length === 0 ? (
            <p>支出データがありません。</p>
          ) : (
            <div className="expenses-table-container">
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th className="col-date">日付</th>
                    <th className="col-amount">金額</th>
                    <th className="col-category">大カテゴリ</th>
                    <th className="col-tags">タグ</th>
                    <th className="col-description">説明</th>
                    <th className="col-payment">支払い方法</th>
                    <th className="col-created">作成日時</th>
                    <th className="col-updated">更新日時</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="col-date">{formatDate(expense.date)}</td>
                      <td className="col-amount expense-amount">¥{expense.amount.toLocaleString()}</td>
                      <td className="col-category">{expense.bigCategory}</td>
                      <td className="col-tags">{expense.tags}</td>
                      <td className="col-description">{expense.description}</td>
                      <td className="col-payment">{expense.paymentMethod}</td>
                      <td className="col-created datetime-cell">{formatDateTime(expense.createdAt)}</td>
                      <td className="col-updated datetime-cell">{formatDateTime(expense.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard

