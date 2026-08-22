import { describe, it, expect } from 'vitest'
import { mapAuthErrorMessage } from './authErrors'

describe('mapAuthErrorMessage', () => {
  it('maps known auth error codes', () => {
    expect(mapAuthErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'このメールアドレスは既に使用されています'
    )
    expect(mapAuthErrorMessage({ code: 'auth/wrong-password' })).toBe(
      'パスワードが間違っています'
    )
  })

  it('returns fallback for unknown errors', () => {
    expect(mapAuthErrorMessage({ code: 'auth/unknown' }, 'カスタムエラー')).toBe(
      'カスタムエラー'
    )
    expect(mapAuthErrorMessage(new Error('boom'))).toBe(
      '操作に失敗しました。しばらくしてから再度お試しください'
    )
  })
})
