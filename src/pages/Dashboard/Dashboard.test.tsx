import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import Dashboard from './Dashboard'
import { useAuth } from '../../context/AuthContext'
import { useDashboardExpenses } from '../../hooks/useDashboardExpenses'
import { useUserName } from '../../hooks/useUserName'
import type { User } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useDashboardExpenses', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../hooks/useDashboardExpenses')>()
  return {
    ...mod,
    useDashboardExpenses: vi.fn(),
  }
})
vi.mock('../../hooks/useUserName')
vi.mock('../../components/ExpenseForm', () => ({
  ExpenseForm: () => <div data-testid="expense-form">Expense Form</div>,
}))
vi.mock('../../components/ExpensesTable', () => ({
  ExpensesTable: ({ expenses, loading }: { expenses: unknown[]; loading: boolean }) => (
    <div data-testid="expenses-table">
      {loading ? '読み込み中…' : `Expenses: ${expenses.length}`}
    </div>
  ),
}))
vi.mock('../../components/ExpenseModal', () => ({
  ExpenseModal: () => <div data-testid="expense-modal">Expense Modal</div>,
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

const defaultDashboardExpensesMock = {
  expenses: [],
  loading: false,
  monthlyTotal: 0,
  monthlyLoading: false,
  currentPage: 1,
  totalPages: 1,
  goToPage: vi.fn(),
  refreshAfterMutation: vi.fn(),
  error: null,
  monthExpenseCount: 0,
  get selectedYearMonth() {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  },
  setSelectedYearMonth: vi.fn(),
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard with user information', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useDashboardExpenses).mockReturnValue({ ...defaultDashboardExpensesMock })

    render(<Dashboard />)

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('今月の支出')).toBeInTheDocument()
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
    vi.mocked(useDashboardExpenses).mockReturnValue({
      ...defaultDashboardExpensesMock,
      loading: true,
      monthlyLoading: true,
    })

    render(<Dashboard />)

    // 読み込み中…が複数あるので、より具体的なクエリを使用
    expect(screen.getAllByText('読み込み中…').length).toBeGreaterThan(0)
    expect(screen.getAllByText('読み込み中...').length).toBeGreaterThan(0)
  })

  it('should display monthly total', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useDashboardExpenses).mockReturnValue({ ...defaultDashboardExpensesMock })

    render(<Dashboard />)

    expect(screen.getByText(/月の合計金額/)).toBeInTheDocument()
  })

  it('should show expense form when button is clicked', async () => {
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
    vi.mocked(useDashboardExpenses).mockReturnValue({ ...defaultDashboardExpensesMock })

    render(<Dashboard />)

    const addButton = screen.getByText('支出を追加')
    await userEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByTestId('expense-form')).toBeInTheDocument()
    })
  })

  it('should render year and month selectors and expense count', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useDashboardExpenses).mockReturnValue({
      ...defaultDashboardExpensesMock,
      monthExpenseCount: 5,
    })

    render(<Dashboard />)

    expect(screen.getByRole('group', { name: '表示する年月' })).toBeInTheDocument()
    expect(screen.getByLabelText('年')).toBeInTheDocument()
    expect(screen.getByLabelText('月')).toBeInTheDocument()
    expect(screen.getByText('5件')).toBeInTheDocument()
  })

  it('should call setSelectedYearMonth when year select changes', async () => {
    const setSelectedYearMonth = vi.fn()
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
    vi.mocked(useDashboardExpenses).mockReturnValue({
      ...defaultDashboardExpensesMock,
      setSelectedYearMonth,
      selectedYearMonth: { year: 2026, month: 4 },
    })

    render(<Dashboard />)

    await userEvent.selectOptions(screen.getByLabelText('年'), '2024')
    expect(setSelectedYearMonth).toHaveBeenCalledWith(2024, 4)
  })

  it('should show list error summary and detail message', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useDashboardExpenses).mockReturnValue({
      ...defaultDashboardExpensesMock,
      error: new Error('failed-precondition: missing index'),
    })

    render(<Dashboard />)

    expect(screen.getByText(/支出一覧の取得に失敗しました/)).toBeInTheDocument()
    expect(screen.getByText(/failed-precondition: missing index/)).toBeInTheDocument()
  })

  it('should render links correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(useUserName).mockReturnValue({
      displayName: 'Test User',
      loading: false,
    })
    vi.mocked(useDashboardExpenses).mockReturnValue({ ...defaultDashboardExpensesMock })

    render(<Dashboard />)

    expect(screen.getByRole('link', { name: 'Test User' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'カテゴリー・タグ管理' })).toHaveAttribute(
      'href',
      '/category-tag-management'
    )
    expect(screen.getByRole('link', { name: /月毎のサマリー/ })).toHaveAttribute(
      'href',
      '/monthly-summary'
    )
  })
})

