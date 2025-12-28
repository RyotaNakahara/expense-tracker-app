import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/testUtils'
import MonthlyExpenses from './MonthlyExpenses'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useUserName } from '../../hooks/useUserName'
import type { User } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useExpenses')
vi.mock('../../hooks/useCategories')
vi.mock('../../hooks/useTags')
vi.mock('../../hooks/useUserName')
vi.mock('../../components/ExpensesTable', () => ({
  ExpensesTable: ({ expenses, loading }: { expenses: unknown[]; loading: boolean }) => (
    <div data-testid="expenses-table">
      {loading ? '読み込み中…' : `Expenses: ${expenses.length}`}
    </div>
  ),
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

describe('MonthlyExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render monthly expenses page', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useExpenses).mockReturnValue({
      expenses: [],
      loading: false,
      error: null,
      refreshExpenses: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      filteredTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })

    render(<MonthlyExpenses />)

    expect(screen.getByText('支出検索')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
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
    vi.mocked(useExpenses).mockReturnValue({
      expenses: [],
      loading: true,
      error: null,
      refreshExpenses: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      filteredTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })

    render(<MonthlyExpenses />)

    // 読み込み中…が複数あるので、より具体的なクエリを使用
    expect(screen.getByTestId('expenses-table')).toHaveTextContent('読み込み中…')
  })

  it('should render search form', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useExpenses).mockReturnValue({
      expenses: [],
      loading: false,
      error: null,
      refreshExpenses: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    })
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      allTags: [],
      filteredTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })

    render(<MonthlyExpenses />)

    expect(screen.getByText('検索条件')).toBeInTheDocument()
  })
})

