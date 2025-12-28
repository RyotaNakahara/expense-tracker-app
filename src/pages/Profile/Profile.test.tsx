import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import Profile from './Profile'
import { useAuth } from '../../context/AuthContext'
import { useUserName } from '../../hooks/useUserName'
import { updateProfile } from 'firebase/auth'
import { setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useUserName')
vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn(),
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

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile page with user information', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: null,
      loading: true,
    })

    render(<Profile />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should switch to edit mode when edit button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })

    render(<Profile />)

    const editButton = screen.getByText('編集')
    await userEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText('名前')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    })
  })

  it('should update profile when form is submitted', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
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
  })

  it('should cancel editing when cancel button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
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
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: null,
      loading: false,
    })

    const { container } = render(<Profile />)
    // userがnullの場合、コンポーネントはnullを返す
    expect(container.firstChild).toBeNull()
  })
})

