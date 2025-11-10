import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import app from '../../firebase/config'
import './Home.css'

interface TestResult {
  name: string
  status: 'loading' | 'success' | 'error'
  message: string
}

const Home = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isTesting, setIsTesting] = useState(false)

  const runTests = async () => {
    console.log('テスト開始')
    setIsTesting(true)
    const results: TestResult[] = []

    // 少し遅延を入れて状態変化を見やすくする
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 1. 環境変数の確認
    results.push({
      name: '環境変数の読み込み',
      status: 'loading',
      message: 'チェック中...',
    })
    setTestResults([...results])

    const hasEnvVars =
      import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (hasEnvVars) {
      results[0] = {
        name: '環境変数の読み込み',
        status: 'success',
        message: '環境変数が正しく読み込まれています',
      }
    } else {
      results[0] = {
        name: '環境変数の読み込み',
        status: 'error',
        message: '環境変数が読み込まれていません。.envファイルを確認してください',
      }
    }
    setTestResults([...results])

    // 2. Firebase初期化の確認
    results.push({
      name: 'Firebase初期化',
      status: 'loading',
      message: 'チェック中...',
    })
    setTestResults([...results])

    try {
      if (app) {
        results[1] = {
          name: 'Firebase初期化',
          status: 'success',
          message: `プロジェクトID: ${app.options.projectId || 'N/A'}`,
        }
      } else {
        results[1] = {
          name: 'Firebase初期化',
          status: 'error',
          message: 'Firebaseアプリが初期化されていません',
        }
      }
    } catch (error) {
      results[1] = {
        name: 'Firebase初期化',
        status: 'error',
        message: `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
    setTestResults([...results])

    setIsTesting(false)
    console.log('テスト完了')
  }

  useEffect(() => {
    // コンポーネントマウント時に自動テスト実行
    runTests()
  }, [])

  const getStatusText = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      case 'loading':
        return '...'
      default:
        return '?'
    }
  }

  return (
    <div className="home-container">
      <h1>Expense Tracker App</h1>
      <h2>Firebase接続テスト</h2>

      <div className="home-login-link-wrapper">
        <Link className="home-login-link" to="/login">
          ログインページへ
        </Link>
      </div>

      <div className="home-test-button-wrapper">
        <button
          className="home-test-button"
          onClick={() => {
            console.log('ボタンクリック')
            runTests()
          }}
          disabled={isTesting}
        >
          {isTesting ? 'テスト実行中...' : 'テストを再実行'}
        </button>
      </div>

      <div className="home-result-list">
        {testResults.map((result, index) => (
          <div key={index} className={`home-result-card home-result-card--${result.status}`}>
            <div className="home-result-header">
              <span className={`home-status-icon home-status-icon--${result.status}`}>
                {getStatusText(result.status)}
              </span>
              <h3 className="home-result-title">{result.name}</h3>
            </div>
            <p className="home-result-message">{result.message}</p>
          </div>
        ))}
      </div>

      {testResults.length === 0 && <p className="home-empty-message">テストを実行中...</p>}

      <div className="home-settings">
        <h3 className="home-settings-title">設定情報</h3>
        <ul className="home-settings-list">
          <li>
            <strong>API Key:</strong>{' '}
            {import.meta.env.VITE_FIREBASE_API_KEY
              ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 10)}...`
              : '未設定'}
          </li>
          <li>
            <strong>Project ID:</strong> {import.meta.env.VITE_FIREBASE_PROJECT_ID || '未設定'}
          </li>
          <li>
            <strong>Auth Domain:</strong> {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '未設定'}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Home
