import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/testUtils'
import MonthlySummary from './MonthlySummary'
import { useAuth } from '../../context/AuthContext'
import { useExpenses } from '../../hooks/useExpenses'
import { useUserName } from '../../hooks/useUserName'
import type { User } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('../../hooks/useExpenses')
vi.mock('../../hooks/useUserName')
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
  Tooltip: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
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

describe('MonthlySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render monthly summary page', () => {
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

    render(<MonthlySummary />)

    expect(screen.getByText('月毎のサマリー')).toBeInTheDocument()
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

    render(<MonthlySummary />)

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('should display empty message when no expenses', () => {
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

    render(<MonthlySummary />)

    expect(screen.getByText(/支出データがありません/)).toBeInTheDocument()
  })
})

