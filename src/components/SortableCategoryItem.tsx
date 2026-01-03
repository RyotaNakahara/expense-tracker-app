import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category } from '../types'
import './SortableItem.css'

interface SortableCategoryItemProps {
  category: Category
  onEdit: (category: Category) => void
}

export const SortableCategoryItem = ({ category, onEdit }: SortableCategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`item-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners} aria-label="ドラッグして順序を変更">
        ⋮⋮
      </div>
      <span
        className="item-name clickable"
        onClick={() => onEdit(category)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onEdit(category)
          }
        }}
        aria-label={`${category.name}を編集`}
      >
        {category.name}
      </span>
    </li>
  )
}

