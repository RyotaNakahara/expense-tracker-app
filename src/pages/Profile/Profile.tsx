import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useUserName } from '../../hooks/useUserName'
import { db } from '../../firebase/config'
import { mapAuthErrorMessage } from '../../utils/authErrors'
import './Profile.css'

const Profile = () => {
  const { user, signOutUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 確認メール反映後など、Auth の最新情報を取り直す
  useEffect(() => {
    void refreshUser()

    const syncLatestUser = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser()
      }
    }

    window.addEventListener('focus', syncLatestUser)
    document.addEventListener('visibilitychange', syncLatestUser)

    return () => {
      window.removeEventListener('focus', syncLatestUser)
      document.removeEventListener('visibilitychange', syncLatestUser)
    }
  }, [refreshUser])

  useEffect(() => {
    if (displayName) {
      setName(displayName)
    }
  }, [displayName])

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user?.email])

  const isEmailChanged =
    Boolean(user?.email) && email.trim().toLowerCase() !== user!.email!.toLowerCase()

  const handleEdit = () => {
    setIsEditing(true)
    setName(displayName || '')
    setEmail(user?.email || '')
    setCurrentPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setName(displayName || '')
    setEmail(user?.email || '')
    setCurrentPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('名前を入力してください')
      return
    }

    if (!trimmedEmail) {
      setError('メールアドレスを入力してください')
      return
    }

    const nameChanged = trimmedName !== (displayName || '')
    const emailChanged =
      Boolean(user.email) && trimmedEmail.toLowerCase() !== user.email!.toLowerCase()

    if (!nameChanged && !emailChanged) {
      setError('変更がありません')
      return
    }

    if (emailChanged && !currentPassword) {
      setError('メールアドレスを変更するには現在のパスワードが必要です')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (nameChanged) {
        await updateProfile(user, {
          displayName: trimmedName,
        })

        const userRef = doc(db, 'users', user.uid)
        await setDoc(
          userRef,
          {
            name: trimmedName,
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }

      if (emailChanged) {
        if (!user.email) {
          throw new Error('現在のメールアドレスを取得できません')
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword)
        await reauthenticateWithCredential(user, credential)
        await verifyBeforeUpdateEmail(user, trimmedEmail)
      }

      if (emailChanged) {
        setSuccess(
          nameChanged
            ? '名前を更新しました。新しいメールアドレス宛に確認メールを送信しました。リンクを開くとメールアドレスが変更されます。'
            : '新しいメールアドレス宛に確認メールを送信しました。リンクを開くとメールアドレスが変更されます。'
        )
        setIsEditing(false)
        setCurrentPassword('')
        setEmail(user.email || '')
      } else {
        setSuccess('プロフィールを更新しました')
        setIsEditing(false)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      console.error('Failed to update profile', err)
      setError(mapAuthErrorMessage(err, 'プロフィールの更新に失敗しました'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  if (!user) {
    return null
  }

  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime)
    : null

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-left">
          <Link to="/dashboard" className="profile-back-button">
            ← ダッシュボードに戻る
          </Link>
          <h1>プロフィール</h1>
        </div>
        <button className="profile-signout-button" onClick={handleSignOut}>
          ログアウト
        </button>
      </header>

      <main className="profile-content">
        <section className="profile-card">
          <div className="profile-card-header">
            <h2>ユーザー情報</h2>
            {!isEditing && (
              <button className="profile-edit-button" onClick={handleEdit}>
                編集
              </button>
            )}
          </div>

          {loadingName ? (
            <p className="loading-text">読み込み中...</p>
          ) : (
            <div className="profile-info">
              {isEditing ? (
                <form className="profile-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">名前</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="名前を入力"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">メールアドレス</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレスを入力"
                      required
                      disabled={submitting}
                      autoComplete="email"
                    />
                    <p className="form-hint">
                      変更する場合は確認メールのリンクを開くと反映されます
                    </p>
                  </div>

                  {isEmailChanged && (
                    <div className="form-group">
                      <label htmlFor="currentPassword">現在のパスワード</label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="現在のパスワードを入力"
                        disabled={submitting}
                        autoComplete="current-password"
                      />
                      <p className="form-hint">
                        メールアドレス変更の確認のため入力してください
                      </p>
                    </div>
                  )}

                  {error && <p className="error-message">{error}</p>}
                  {success && <p className="success-message">{success}</p>}

                  <div className="profile-form-actions">
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={submitting}
                    >
                      {submitting ? '更新中...' : '更新'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-details">
                  {success && <p className="success-message">{success}</p>}
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">名前</span>
                    <span className="profile-detail-value">
                      {displayName || '未設定'}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">メールアドレス</span>
                    <span className="profile-detail-value">{user.email}</span>
                  </div>
                  {createdAt && (
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">アカウント作成日</span>
                      <span className="profile-detail-value">
                        {createdAt.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {user.metadata.lastSignInTime && (
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">最終ログイン</span>
                      <span className="profile-detail-value">
                        {new Date(
                          user.metadata.lastSignInTime
                        ).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Profile
