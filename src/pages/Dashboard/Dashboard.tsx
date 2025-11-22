import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { doc, getDoc, collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore'
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

// 支払い方法の選択肢
const PAYMENT_METHODS = [
  '現金',
  'クレジットカード',
  'PayPay',
  'その他',
]

// Category型の定義
interface Category {
  id: string
  name: string
}

// Tag型の定義
interface Tag {
  id: string
  name: string
  categoryId: string
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
  
  // カテゴリーとタグの状態
  const [categories, setCategories] = useState<Category[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([]) // すべてのタグ
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]) // フィルタリングされたタグ
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true)
  const [loadingTags, setLoadingTags] = useState<boolean>(true)
  
  // 支出登録フォームの状態
  const [showForm, setShowForm] = useState<boolean>(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    bigCategory: '',
    tags: [] as string[],
    paymentMethod: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState<boolean>(false)

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

  // Firestore の categories コレクションからカテゴリーデータを取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('Fetching categories from Firestore...')
        const categoriesRef = collection(db, 'categories')
        const querySnapshot = await getDocs(categoriesRef)
        
        console.log('Categories query snapshot size:', querySnapshot.size)
        
        const categoriesData: Category[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          console.log('Category doc:', doc.id, data)
          // nameフィールドがあればそれを使用、なければドキュメントIDを使用
          categoriesData.push({
            id: doc.id,
            name: data.name || doc.id,
          })
        })
        
        // nameでソート
        categoriesData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        
        console.log('Loaded categories:', categoriesData)
        setCategories(categoriesData)
      } catch (e) {
        console.error('Failed to load categories', e)
        setCategories([])
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Firestore の tags コレクションからタグデータを取得
  useEffect(() => {
    const fetchTags = async () => {
      try {
        console.log('Fetching tags from Firestore...')
        const tagsRef = collection(db, 'tags')
        const querySnapshot = await getDocs(tagsRef)
        
        console.log('Tags query snapshot size:', querySnapshot.size)
        
        const tagsData: Tag[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          console.log('Tag doc:', doc.id, data)
          // nameフィールドがあればそれを使用、なければドキュメントIDを使用
          tagsData.push({
            id: doc.id,
            name: data.name || doc.id,
            categoryId: data.categoryId || '',
          })
        })
        
        // nameでソート
        tagsData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        
        console.log('Loaded tags:', tagsData)
        setAllTags(tagsData)
      } catch (e) {
        console.error('Failed to load tags', e)
        setAllTags([])
      } finally {
        setLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

  // 選択されたカテゴリーに基づいてタグをフィルタリング
  useEffect(() => {
    if (!formData.bigCategory) {
      setFilteredTags([])
      return
    }

    // 選択されたカテゴリー名からカテゴリーIDを取得
    const selectedCategory = categories.find(cat => cat.name === formData.bigCategory)
    if (!selectedCategory) {
      setFilteredTags([])
      return
    }

    // カテゴリーIDでフィルタリング
    const filtered = allTags.filter(tag => tag.categoryId === selectedCategory.id)
    setFilteredTags(filtered)
  }, [formData.bigCategory, categories, allTags])

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

  // タグの選択/解除を処理
  const handleTagToggle = (tagName: string) => {
    setFormData((prev) => {
      const newTags = prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName]
      return { ...prev, tags: newTags }
    })
  }

  // 初期データを追加する関数
  const initializeData = async () => {
    if (!user?.uid) {
      alert('ログインが必要です')
      return
    }

    try {
      // カテゴリーの初期データ
      const defaultCategories = [
        '食費',
        '交通費',
        '日用品',
        '娯楽',
        '医療費',
        '教育費',
        '光熱費',
        '通信費',
        'その他',
      ]

      // 既存のカテゴリーを確認
      const categoriesRef = collection(db, 'categories')
      const categoriesSnapshot = await getDocs(categoriesRef)
      const existingCategoryNames = new Set<string>()
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        existingCategoryNames.add(data.name || doc.id)
      })

      // 存在しないカテゴリーのみ追加
      for (const categoryName of defaultCategories) {
        if (!existingCategoryNames.has(categoryName)) {
          await addDoc(collection(db, 'categories'), {
            name: categoryName,
          })
        }
      }

      // 既存のタグを確認
      const tagsRef = collection(db, 'tags')
      const tagsSnapshot = await getDocs(tagsRef)
      const existingTagNames = new Set<string>()
      tagsSnapshot.forEach((doc) => {
        const data = doc.data()
        existingTagNames.add(data.name || doc.id)
      })

      // タグは初期データとして追加しない（カテゴリーごとに個別に追加する必要があるため）

      // データを再読み込み
      const fetchCategories = async () => {
        const categoriesRef = collection(db, 'categories')
        const querySnapshot = await getDocs(categoriesRef)
        const categoriesData: Category[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          categoriesData.push({
            id: doc.id,
            name: data.name || doc.id,
          })
        })
        categoriesData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        setCategories(categoriesData)
      }

      const fetchTags = async () => {
        const tagsRef = collection(db, 'tags')
        const querySnapshot = await getDocs(tagsRef)
        const tagsData: Tag[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          tagsData.push({
            id: doc.id,
            name: data.name || doc.id,
            categoryId: data.categoryId || '',
          })
        })
        tagsData.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        setAllTags(tagsData)
      }

      await Promise.all([fetchCategories(), fetchTags()])
      alert('初期データを追加しました')
    } catch (error) {
      console.error('Failed to initialize data', error)
      alert('初期データの追加に失敗しました')
    }
  }

  // フォームの送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.uid) {
      alert('ログインが必要です')
      return
    }

    if (!formData.date || !formData.amount || !formData.bigCategory || !formData.paymentMethod) {
      alert('必須項目を入力してください')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('有効な金額を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const now = Timestamp.now()
      const expenseDate = Timestamp.fromDate(new Date(formData.date))
      
      // タグをカンマ区切りの文字列に変換
      const tagsString = formData.tags.join(', ')

      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        date: expenseDate,
        amount: amount,
        bigCategory: formData.bigCategory,
        tags: tagsString,
        paymentMethod: formData.paymentMethod,
        description: formData.description || '',
        createdAt: now,
        updatedAt: now,
      })

      // フォームをリセット
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        bigCategory: '',
        tags: [],
        paymentMethod: '',
        description: '',
      })
      setShowForm(false)

      // 一覧を再取得
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
      
      expensesData.sort((a, b) => {
        const dateA = a.date?.toMillis() || 0
        const dateB = b.date?.toMillis() || 0
        return dateB - dateA
      })
      
      setExpenses(expensesData)
    } catch (error) {
      console.error('Failed to save expense', error)
      alert('支出の登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
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

        <section className="dashboard-card expense-form-section">
          <div className="expense-form-header">
            <h2>支出を登録</h2>
            <button
              className="toggle-form-button"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'フォームを閉じる' : '支出を追加'}
            </button>
          </div>
          
          {showForm && (
            <form className="expense-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">日付 <span className="required">*</span></label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="amount">金額 <span className="required">*</span></label>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bigCategory">カテゴリー <span className="required">*</span></label>
                  {loadingCategories ? (
                    <p>読み込み中...</p>
                  ) : categories.length === 0 ? (
                    <div className="empty-data-message">
                      <p>カテゴリーが登録されていません</p>
                      <button
                        type="button"
                        className="initialize-data-button"
                        onClick={initializeData}
                      >
                        初期データを追加
                      </button>
                    </div>
                  ) : (
                    <select
                      id="bigCategory"
                      value={formData.bigCategory}
                      onChange={(e) => {
                        // カテゴリーが変更されたらタグの選択をリセット
                        setFormData({ 
                          ...formData, 
                          bigCategory: e.target.value,
                          tags: []
                        })
                      }}
                      required
                    >
                      <option value="">選択してください</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="paymentMethod">支払い方法 <span className="required">*</span></label>
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    required
                  >
                    <option value="">選択してください</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>タグ</label>
                {!formData.bigCategory ? (
                  <p className="tag-hint">カテゴリーを選択するとタグが表示されます</p>
                ) : loadingTags ? (
                  <p>読み込み中...</p>
                ) : filteredTags.length === 0 ? (
                  <div className="empty-data-message">
                    <p>このカテゴリーに紐づくタグがありません</p>
                  </div>
                ) : (
                  <div className="tags-selection">
                    {filteredTags.map((tag) => (
                      <label key={tag.id} className="tag-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.tags.includes(tag.name)}
                          onChange={() => handleTagToggle(tag.name)}
                        />
                        <span>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="メモや詳細を入力（任意）"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      amount: '',
                      bigCategory: '',
                      tags: [],
                      paymentMethod: '',
                      description: '',
                    })
                  }}
                  disabled={submitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          )}
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

