import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/testUtils'
import { ExpenseForm } from './ExpenseForm'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useExpenses } from '../hooks/useExpenses'

// モック
vi.mock('../hooks/useCategories')
vi.mock('../hooks/useTags')
vi.mock('../hooks/useExpenses')
vi.mock('../services/categoryService', () => ({
  categoryService: {
    createCategory: vi.fn(),
  },
}))

const mockCategories = [
  { id: 'cat1', name: '食費' },
  { id: 'cat2', name: '交通費' },
]

const mockTags = [
  { id: 'tag1', name: 'タグ1', categoryId: 'cat1' },
  { id: 'tag2', name: 'タグ2', categoryId: 'cat1' },
]

describe('ExpenseForm', () => {
  const mockOnSuccess = vi.fn()
  const mockCreateExpense = vi.fn()
  const mockRefreshCategories = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCategories).mockReturnValue({
      categories: mockCategories,
      loading: false,
      error: null,
      refreshCategories: mockRefreshCategories,
    })
    vi.mocked(useTags).mockReturnValue({
      filteredTags: [],
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })
    vi.mocked(useExpenses).mockReturnValue({
      expenses: [],
      loading: false,
      error: null,
      refreshExpenses: vi.fn(),
      createExpense: mockCreateExpense,
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    })
  })

  it('should render expense form', () => {
    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    expect(screen.getByLabelText(/日付/)).toBeInTheDocument()
    expect(screen.getByLabelText(/金額/)).toBeInTheDocument()
    expect(screen.getByLabelText(/カテゴリー/)).toBeInTheDocument()
    expect(screen.getByLabelText(/支払い方法/)).toBeInTheDocument()
  })

  it('should display categories in dropdown', () => {
    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    const categorySelect = screen.getByLabelText(/カテゴリー/)
    expect(categorySelect).toBeInTheDocument()
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
  })

  it('should show tags when category is selected', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useTags).mockReturnValue({
      filteredTags: mockTags,
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })

    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    const categorySelect = screen.getByLabelText(/カテゴリー/)
    await userEvent.selectOptions(categorySelect, '食費')

    await waitFor(() => {
      expect(screen.getByText('タグ1')).toBeInTheDocument()
      expect(screen.getByText('タグ2')).toBeInTheDocument()
    })
  })

  it('should show loading state for categories', () => {
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: true,
      error: null,
      refreshCategories: mockRefreshCategories,
    })

    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show empty message when no categories', () => {
    vi.mocked(useCategories).mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refreshCategories: mockRefreshCategories,
    })

    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    expect(screen.getByText('カテゴリーが登録されていません')).toBeInTheDocument()
  })

  it('should call createExpense when form is submitted with valid data', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    mockCreateExpense.mockResolvedValue(undefined)
    global.alert = vi.fn()

    render(<ExpenseForm userId="test-user" onSuccess={mockOnSuccess} />)

    // 日付フィールドに値を設定
    const dateInput = screen.getByLabelText(/日付/) as HTMLInputElement
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2024-01-01')

    // 金額フィールドに値を設定
    const amountInput = screen.getByLabelText(/金額/) as HTMLInputElement
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '1000')

    // カテゴリーを選択
    const categorySelect = screen.getByLabelText(/カテゴリー/) as HTMLSelectElement
    await userEvent.selectOptions(categorySelect, '食費')

    // 支払い方法を選択
    const paymentSelect = screen.getByLabelText(/支払い方法/) as HTMLSelectElement
    await userEvent.selectOptions(paymentSelect, '現金')

    // フォームを送信
    const submitButton = screen.getByRole('button', { name: '登録' })
    await userEvent.click(submitButton)

    await waitFor(
      () => {
        expect(mockCreateExpense).toHaveBeenCalled()
        expect(mockOnSuccess).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )
  })
})

