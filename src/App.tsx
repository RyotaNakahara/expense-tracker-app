import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* トップページ：Firebase接続テスト用 */}
        <Route path="/" element={<Home />} />
        {/* 未ログインでもアクセス可能なログインページ */}
        <Route path="/login" element={<Login />} />
        {/* ログイン済みユーザーのみ閲覧できるダッシュボード */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* 定義されていないパスはトップへリダイレクト */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
