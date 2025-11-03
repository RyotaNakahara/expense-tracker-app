import { useEffect, useState } from 'react'
import app from '../firebase/config'

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
    await new Promise(resolve => setTimeout(resolve, 100))

    // 1. 環境変数の確認
    results.push({
      name: '環境変数の読み込み',
      status: 'loading',
      message: 'チェック中...',
    })
    setTestResults([...results])

    const hasEnvVars =
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID

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

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '#10b981' // green
      case 'error':
        return '#ef4444' // red
      case 'loading':
        return '#3b82f6' // blue
      default:
        return '#6b7280' // gray
    }
  }

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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Expense Tracker App</h1>
      <h2>Firebase接続テスト</h2>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => {
            console.log('ボタンクリック')
            runTests()
          }}
          disabled={isTesting}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: isTesting ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isTesting) {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }
          }}
          onMouseLeave={(e) => {
            if (!isTesting) {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }
          }}
        >
          {isTesting ? 'テスト実行中...' : 'テストを再実行'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {testResults.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '1rem',
              border: `2px solid ${getStatusColor(result.status)}`,
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1.5rem',
                  color: getStatusColor(result.status),
                  fontWeight: 'bold',
                }}
              >
                {getStatusText(result.status)}
              </span>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{result.name}</h3>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', color: '#4b5563' }}>
              {result.message}
            </p>
          </div>
        ))}
      </div>

      {testResults.length === 0 && (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
          テストを実行中...
        </p>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>設定情報</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>
            <strong>API Key:</strong>{' '}
            {import.meta.env.VITE_FIREBASE_API_KEY
              ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 10)}...`
              : '未設定'}
          </li>
          <li>
            <strong>Project ID:</strong>{' '}
            {import.meta.env.VITE_FIREBASE_PROJECT_ID || '未設定'}
          </li>
          <li>
            <strong>Auth Domain:</strong>{' '}
            {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '未設定'}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Home
