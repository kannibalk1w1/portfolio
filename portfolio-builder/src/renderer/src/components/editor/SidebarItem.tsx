import { useState } from 'react'
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
  project: '📋',
}

interface Props {
  section: Section
  active: boolean
  onClick: () => void
  onToggleVisible: () => void
  onToggleNav: () => void
  onToggleSubPage: () => void
  onToggleGap: () => void
  onDelete: () => void
}

export function SidebarItem({ section, active, onClick, onToggleVisible, onToggleNav, onToggleSubPage, onToggleGap, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })
  const [hovered, setHovered] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete "${section.title}"? This cannot be undone.`)) onDelete()
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, borderRadius: 6, background: active ? '#f0f0f0' : 'transparent', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#ccc', fontSize: 14, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >⠿</span>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{SECTION_ICONS[section.type] ?? '📄'}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {section.title}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onToggleVisible() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: section.visible ? '#555' : '#ccc', fontSize: 14, flexShrink: 0 }}
          title={section.visible ? 'Hide section' : 'Show section'}
          aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`}
        >{section.visible ? '👁' : '🙈'}</button>
        <button
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, color: hovered || active ? '#e94560' : 'transparent', transition: 'color 0.1s' }}
          title={`Delete ${section.title}`}
          aria-label={`Delete ${section.title}`}
        >×</button>
      </div>

      {/* Toggles row — visible when active or hovered */}
      {(active || hovered) && (
        <div
          style={{ display: 'flex', gap: 10, paddingLeft: 22, paddingBottom: 6, flexWrap: 'wrap' }}
          onClick={e => e.stopPropagation()}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={section.showInNav !== false} onChange={() => onToggleNav()} style={{ margin: 0 }} />
            In nav
          </label>
          {section.type !== 'about' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={!!section.isSubPage} onChange={() => onToggleSubPage()} style={{ margin: 0 }} />
              Own page
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={!!section.removeGapAbove} onChange={() => onToggleGap()} style={{ margin: 0 }} />
            No gap
          </label>
        </div>
      )}
    </div>
  )
}
