/** Firebase Auth のエラーを日本語メッセージに変換する */
export const mapAuthErrorMessage = (
  error: unknown,
  fallback = '操作に失敗しました。しばらくしてから再度お試しください'
): string => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : undefined

  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません'
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に使用されています'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'パスワードが間違っています'
    case 'auth/requires-recent-login':
      return 'セキュリティのため、再度ログインしてからお試しください'
    case 'auth/too-many-requests':
      return 'リクエストが多すぎます。しばらく待ってから再試行してください'
    case 'auth/user-disabled':
      return 'このユーザーは無効化されています'
    case 'auth/user-mismatch':
      return '認証情報が一致しません'
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました。接続を確認してください'
    default:
      return fallback
  }
}
