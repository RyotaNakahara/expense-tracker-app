import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useUserName } from '../../hooks/useUserName'
import { db } from '../../firebase/config'
import './Profile.css'

const Profile = () => {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const { displayName, loading: loadingName } = useUserName(user)

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (displayName) {
      setName(displayName)
    }
  }, [displayName])

  const handleEdit = () => {
    setIsEditing(true)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setName(displayName || '')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Firebase AuthのdisplayNameを更新
      await updateProfile(user, {
        displayName: name.trim(),
      })

      // Firestoreのusersコレクションも更新
      const userRef = doc(db, 'users', user.uid)
      await setDoc(
        userRef,
        {
          name: name.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      )

      setSuccess('プロフィールを更新しました')
      setIsEditing(false)
      
      // ページをリロードして最新の情報を反映
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error('Failed to update profile', err)
      setError('プロフィールの更新に失敗しました')
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
                    <label>メールアドレス</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="disabled-input"
                    />
                    <p className="form-hint">メールアドレスは変更できません</p>
                  </div>

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

