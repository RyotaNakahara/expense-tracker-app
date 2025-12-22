// React からコンテキスト/フック周りの機能と型をインポート
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
// Firebase Authentication で利用するメソッドと型をインポート
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
// 初期化済み Firebase アプリから取り出した認証インスタンス
import { auth } from '../firebase/config'

// コンテキストから参照できる値の形を定義
interface AuthContextValue {
  user: User | null
  loading: boolean
  signOutUser: () => Promise<void>
}

// 認証関連の値を共有するためのコンテキストを作成
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // 現在ログインしているユーザー情報
  const [user, setUser] = useState<User | null>(null)
  // 認証状態の確認中かどうか
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firebase Auth の認証状態を監視し、ユーザー情報を保持する
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    // コンポーネントのアンマウント時に監視を解除
    return () => unsubscribe()
  }, [])

  // ログアウト処理を共通化
  const signOutUser = async () => {
    await signOut(auth)
  }

  const value: AuthContextValue = {
    user,
    loading,
    signOutUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}


