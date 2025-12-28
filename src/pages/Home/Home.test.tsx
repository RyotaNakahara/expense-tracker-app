import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/testUtils'
import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render home page', () => {
    render(<Home />)

    expect(screen.getByText('Expense Tracker App')).toBeInTheDocument()
    expect(screen.getByText('Firebase接続テスト')).toBeInTheDocument()
    expect(screen.getByText('ログインページへ')).toBeInTheDocument()
  })

  it('should display test button', async () => {
    render(<Home />)

    // テストが完了するまで待つ
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'テストを再実行' })).toBeInTheDocument()
    })
  })

  it('should run tests on mount', async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText(/環境変数の読み込み/)).toBeInTheDocument()
    })
  })

  it('should display settings information', () => {
    render(<Home />)

    expect(screen.getByText('設定情報')).toBeInTheDocument()
    expect(screen.getByText(/API Key:/)).toBeInTheDocument()
    expect(screen.getByText(/Project ID:/)).toBeInTheDocument()
    expect(screen.getByText(/Auth Domain:/)).toBeInTheDocument()
  })
})

