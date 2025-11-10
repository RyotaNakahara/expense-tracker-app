import { FormEvent, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import './Login.css'

// Firebase Authentication を利用したメール・パスワードログイン画面のコンポーネントです。

const Login = () => {
  // ユーザーがフォームに入力した内容と、操作状態・メッセージを管理するためのステート
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // フォーム送信時に Firebase Authentication へサインインをリクエストする処理
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // 未入力の項目がある場合はリクエストを送らず、エラーメッセージを表示
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      // Firebase Auth でメール・パスワード認証を実行
      await signInWithEmailAndPassword(auth, email, password)
      setSuccessMessage('ログインに成功しました')
      setPassword('')
    } catch (error) {
      // Firebase が返すエラーコードを日本語メッセージに変換して表示
      if (error instanceof Error) {
        setErrorMessage(mapAuthErrorMessage(error))
      } else {
        setErrorMessage('予期せぬエラーが発生しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <section className="login-hero">
          <div className="login-hero__badge">EXPENSE TRACKER</div>
          <h1 className="login-hero__title">家計管理アプリ</h1>
          <p className="login-hero__footnote">
            まだアカウントをお持ちでない場合は管理者に連絡してください。
          </p>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <header className="login-header">
            <h2 id="login-title" className="login-title">
              ログイン
            </h2>
            <p className="login-subtitle">登録済みのメールアドレスとパスワードを入力してください</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* メールアドレス入力欄 */}
            <label className="login-label" htmlFor="login-email">
              <span>メールアドレス</span>
              <input
                id="login-email"
                className="login-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your.name@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                required
                aria-describedby="login-email-hint"
              />
            </label>

            {/* パスワード入力欄 */}
            <label className="login-label" htmlFor="login-password">
              <span>パスワード</span>
              <input
                id="login-password"
                className="login-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="半角英数字8文字以上"
                autoComplete="current-password"
                disabled={isSubmitting}
                required
                aria-describedby="login-password-hint"
              />
              <small id="login-password-hint" className="login-hint">
                パスワードを忘れた場合は管理者までご連絡ください
              </small>
            </label>

            <div className="login-actions">
              <button className="login-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>
          </form>

          {/* エラーメッセージ・成功メッセージの表示 */}
          {(errorMessage || successMessage) && (
            <div className="login-feedback" aria-live="polite">
              {errorMessage && <p className="login-alert login-alert--error">{errorMessage}</p>}
              {successMessage && (
                <p className="login-alert login-alert--success">{successMessage}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const mapAuthErrorMessage = (error: Error) => {
  const code = (error as { code?: string }).code

  // Firebase Authentication が返すエラーコードを日本語メッセージに変換
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません'
    case 'auth/user-disabled':
      return 'このユーザーは無効化されています'
    case 'auth/user-not-found':
      return 'ユーザーが存在しません。メールアドレスを確認してください'
    case 'auth/wrong-password':
      return 'パスワードが間違っています'
    case 'auth/too-many-requests':
      return 'リクエストが多すぎます。しばらく待ってから再試行してください'
    default:
      return 'ログインに失敗しました。しばらくしてから再度お試しください'
  }
}

export default Login
