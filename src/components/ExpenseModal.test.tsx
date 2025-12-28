import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/testUtils'
import { ExpenseModal } from './ExpenseModal'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useExpenses } from '../hooks/useExpenses'
import { Timestamp } from 'firebase/firestore'
import type { Expense } from '../types'

// モック
vi.mock('../hooks/useCategories')
vi.mock('../hooks/useTags')
vi.mock('../hooks/useExpenses')

const mockCategories = [
  { id: 'cat1', name: '食費' },
  { id: 'cat2', name: '交通費' },
]

const mockTags = [
  { id: 'tag1', name: 'タグ1', categoryId: 'cat1' },
  { id: 'tag2', name: 'タグ2', categoryId: 'cat1' },
]

const mockExpense: Expense = {
  id: 'expense1',
  userId: 'user1',
  date: Timestamp.fromDate(new Date('2024-01-01')),
  amount: 1000,
  bigCategory: '食費',
  tags: 'タグ1, タグ2',
  paymentMethod: '現金',
  description: 'テスト説明',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

describe('ExpenseModal', () => {
  const mockOnClose = vi.fn()
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockUpdateExpense = vi.fn()
  const mockDeleteExpense = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
    global.alert = vi.fn()

    vi.mocked(useCategories).mockReturnValue({
      categories: mockCategories,
      loading: false,
      error: null,
      refreshCategories: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      filteredTags: mockTags,
      loading: false,
      error: null,
      refreshTags: vi.fn(),
    })
    vi.mocked(useExpenses).mockReturnValue({
      expenses: [],
      loading: false,
      error: null,
      refreshExpenses: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: mockUpdateExpense,
      deleteExpense: mockDeleteExpense,
    })
  })

  it('should not render when expense is null', () => {
    const { container } = render(
      <ExpenseModal
        expense={null}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render modal with expense data', () => {
    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('支出の編集')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テスト説明')).toBeInTheDocument()
  })

  it('should close modal when close button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const closeButton = screen.getByRole('button', { name: '×' })
    await userEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should update expense when form is submitted', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    mockUpdateExpense.mockResolvedValue(undefined)

    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const amountInput = screen.getByLabelText(/金額/)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '2000')

    const submitButton = screen.getByRole('button', { name: '更新' })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateExpense).toHaveBeenCalled()
      expect(mockOnUpdate).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should delete expense when delete button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    mockDeleteExpense.mockResolvedValue(undefined)

    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: '削除' })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
      expect(mockDeleteExpense).toHaveBeenCalledWith('expense1')
      expect(mockOnDelete).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should not delete expense when confirm is cancelled', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    global.confirm = vi.fn(() => false)

    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: '削除' })
    await userEvent.click(deleteButton)

    expect(global.confirm).toHaveBeenCalled()
    expect(mockDeleteExpense).not.toHaveBeenCalled()
  })

  it('should display tags when category is selected', async () => {
    render(
      <ExpenseModal
        expense={mockExpense}
        userId="test-user"
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('タグ1')).toBeInTheDocument()
      expect(screen.getByText('タグ2')).toBeInTheDocument()
    })
  })
})

