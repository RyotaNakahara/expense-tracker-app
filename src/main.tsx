import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* アプリ全体を認証コンテキストでラップ */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
