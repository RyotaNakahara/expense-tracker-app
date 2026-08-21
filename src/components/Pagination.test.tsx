import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/testUtils'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when only one page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    )
    expect(container.querySelector('.pagination')).toBeNull()
  })

  it('navigates prev/next and page numbers', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: '前へ' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: '次へ' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: '5' }))
    expect(onPageChange).toHaveBeenCalledWith(5)
  })

  it('disables prev on first page and next on last page', () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).not.toBeDisabled()

    rerender(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '前へ' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })
})
