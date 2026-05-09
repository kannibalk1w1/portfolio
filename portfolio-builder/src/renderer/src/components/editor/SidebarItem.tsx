import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Section } from '../../types/portfolio'

const SECTION_ICONS: Record<string, string> = {
  about: '👤',
  gallery: '🖼',
  videos: '🎬',
  models: '📦',
  games: '🎮',
  code: '💻',
  custom: '📝',
}

interface Props {
  section: Section
  active: boolean
  onClick: () => void
  onToggleVisible: () => void
}

export function SidebarItem({ section, active, onClick, onToggleVisible }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 6,
        background: active ? '#f0f0f0' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#ccc', fontSize: 14, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        ⠿
      </span>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{SECTION_ICONS[section.type] ?? '📄'}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {section.title}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onToggleVisible() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: section.visible ? '#555' : '#ccc', fontSize: 14, flexShrink: 0 }}
        title={section.visible ? 'Hide section' : 'Show section'}
        aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`}
      >
        {section.visible ? '👁' : '🙈'}
      </button>
    </div>
  )
}
