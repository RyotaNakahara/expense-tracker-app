import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import Profile from './Profile'
import { useAuth } from '../../context/AuthContext'
import { useUserName } from '../../hooks/useUserName'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'

vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useUserName')
vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}))
vi.mock('../../firebase/config', () => ({
  db: {},
}))

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

const mockAuthValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
  user: mockUser,
  loading: false,
  signOutUser: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile page with user information', () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    expect(screen.getByText('プロフィール')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: null,
      loading: true,
    })

    render(<Profile />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should switch to edit mode when edit button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    const editButton = screen.getByText('編集')
    await userEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText('名前')).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })
  })

  it('should update profile when form is submitted', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(updateProfile).mockResolvedValue(undefined)
    vi.mocked(setDoc).mockResolvedValue(undefined)

    render(<Profile />)

    const editButton = screen.getByText('編集')
    await userEvent.click(editButton)

    const nameInput = screen.getByLabelText('名前')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Updated Name')

    const submitButton = screen.getByText('更新')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Updated Name',
      })
    })
    expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled()
  })

  it('should request email change after reauthentication', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()
    const credential = { providerId: 'password' }

    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(EmailAuthProvider.credential).mockReturnValue(credential as never)
    vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as never)
    vi.mocked(verifyBeforeUpdateEmail).mockResolvedValue(undefined)

    render(<Profile />)

    await userEvent.click(screen.getByText('編集'))

    const emailInput = screen.getByLabelText('メールアドレス')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'new@example.com')

    const passwordInput = await screen.findByLabelText('現在のパスワード')
    await userEvent.type(passwordInput, 'secret-password')

    await userEvent.click(screen.getByText('更新'))

    await waitFor(() => {
      expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
        'test@example.com',
        'secret-password'
      )
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(mockUser, credential)
      expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(mockUser, 'new@example.com')
    })

    expect(
      await screen.findByText(
        '新しいメールアドレス宛に確認メールを送信しました。リンクを開くとメールアドレスが変更されます。'
      )
    ).toBeInTheDocument()
  })

  it('should require password when changing email', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    await userEvent.click(screen.getByText('編集'))

    const emailInput = screen.getByLabelText('メールアドレス')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'new@example.com')

    await userEvent.click(screen.getByText('更新'))

    expect(
      await screen.findByText('メールアドレスを変更するには現在のパスワードが必要です')
    ).toBeInTheDocument()
    expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled()
  })

  it('should cancel editing when cancel button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue(mockAuthValue())
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    const editButton = screen.getByText('編集')
    await userEvent.click(editButton)

    const cancelButton = screen.getByText('キャンセル')
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByText('編集')).toBeInTheDocument()
      expect(screen.queryByLabelText('名前')).not.toBeInTheDocument()
    })
  })

  it('should not render when user is null', () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null }))
    vi.mocked(useUserName).mockReturnValue({
      displayName: null,
      loading: false,
    })

    const { container } = render(<Profile />)
    expect(container.firstChild).toBeNull()
  })

  it('should refresh user on mount to sync latest email', () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ refreshUser }))
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    expect(refreshUser).toHaveBeenCalled()
  })
})
