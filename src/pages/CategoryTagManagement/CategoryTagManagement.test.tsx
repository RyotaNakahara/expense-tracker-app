import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import CategoryTagManagement from './CategoryTagManagement'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import type { User } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useCategories')
vi.mock('../../hooks/useTags')
vi.mock('../../hooks/useUserName')
vi.mock('../../components/CategoryForm', () => ({
  CategoryForm: () => <div data-testid="category-form">Category Form</div>,
}))
vi.mock('../../components/TagForm', () => ({
  TagForm: () => <div data-testid="tag-form">Tag Form</div>,
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

describe('CategoryTagManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render category tag management page', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    })

    render(<CategoryTagManagement />)

    expect(screen.getByText('カテゴリー・タグ管理')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should show category form when button is clicked', async () => {
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
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    })

    render(<CategoryTagManagement />)

    const categoryButton = screen.getByText(/カテゴリーを追加/)
    await userEvent.click(categoryButton)

    await waitFor(() => {
      expect(screen.getByTestId('category-form')).toBeInTheDocument()
    })
  })

  it('should show tag form when button is clicked', async () => {
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
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    })

    render(<CategoryTagManagement />)

    const tagButton = screen.getByText(/タグを追加/)
    await userEvent.click(tagButton)

    await waitFor(() => {
      expect(screen.getByTestId('tag-form')).toBeInTheDocument()
    })
  })
})

