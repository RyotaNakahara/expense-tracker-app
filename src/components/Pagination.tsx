import { buildPaginationItems } from '../utils/pagination'
import './Pagination.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) {
    return null
  }

  const items = buildPaginationItems(currentPage, totalPages)

  return (
    <nav className="pagination" aria-label="ページ送り">
      <button
        type="button"
        className="pagination-nav"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        前へ
      </button>
      <ol className="pagination-pages">
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`pagination-page${item === currentPage ? ' pagination-page--active' : ''}`}
                onClick={() => onPageChange(item)}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ol>
      <button
        type="button"
        className="pagination-nav"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        次へ
      </button>
    </nav>
  )
}
