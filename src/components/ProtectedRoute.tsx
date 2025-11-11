import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

// 認証済みユーザーのみ子コンポーネントを表示するルートガード
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  // 認証状態の判定が完了していない場合は読み込み表示
  if (loading) {
    return (
      <div className="route-loading">
        <p>認証状態を確認しています...</p>
      </div>
    )
  }

  // 未認証ならログインページへリダイレクト
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 認証済みなら子要素をそのまま表示
  return <>{children}</>
}

export default ProtectedRoute

