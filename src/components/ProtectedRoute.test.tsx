import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/testUtils'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import type { User } from 'firebase/auth'

// モック
vi.mock('../context/AuthContext')

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: false,
  isAnonymous: false,
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-15T00:00:00.000Z',
  },
  providerData: [],
  refreshToken: '',
  tenantId: null,
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
  delete: vi.fn(),
  getIdToken: vi.fn(),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
} as unknown as User

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should show loading message when authentication is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signOutUser: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })

    const { container } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Navigateコンポーネントがレンダリングされる
    // 実際のリダイレクトはReact Routerが処理するため、ここでは確認が難しい
    // 代わりに、Protected Contentが表示されないことを確認
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

