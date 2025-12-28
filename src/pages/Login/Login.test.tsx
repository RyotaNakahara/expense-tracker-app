import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import Login from './Login'
import { useAuth } from '../../context/AuthContext'
import { signInWithEmailAndPassword } from 'firebase/auth'

// モック
vi.mock('../../context/AuthContext')
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
}))
vi.mock('../../firebase/config', () => ({
  auth: {},
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login page', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })

    render(<Login />)

    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('半角英数字8文字以上')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signOutUser: vi.fn(),
    })

    render(<Login />)

    expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument()
  })

  it('should submit login form with valid credentials', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: {} as never,
    } as never)

    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByPlaceholderText('半角英数字8文字以上')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      )
    })
  })

  it('should display error message when login fails', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('Invalid credentials'))

    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByPlaceholderText('半角英数字8文字以上')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/ログインに失敗しました/)).toBeInTheDocument()
    })
  })

  it('should display error when fields are empty', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup()

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOutUser: vi.fn(),
    })

    render(<Login />)

    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('メールアドレスとパスワードを入力してください')).toBeInTheDocument()
    })
  })
})

