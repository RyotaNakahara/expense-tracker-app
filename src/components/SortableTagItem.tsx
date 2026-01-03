import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Tag } from '../types'
import './SortableItem.css'

interface SortableTagItemProps {
  tag: Tag
  onEdit: (tag: Tag) => void
}

export const SortableTagItem = ({ tag, onEdit }: SortableTagItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id })

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
        onClick={() => onEdit(tag)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onEdit(tag)
          }
        }}
        aria-label={`${tag.name}を編集`}
      >
        {tag.name}
      </span>
    </li>
  )
}

