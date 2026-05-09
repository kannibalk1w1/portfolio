import { useEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { usePortfolio } from '../../store/PortfolioContext'
import { SidebarItem } from './SidebarItem'
import { SnapshotPanel } from '../shared/SnapshotPanel'
import type { Section, SectionType, AboutSection, GallerySection, VideosSection, ModelsSection, GamesSection, CodeSection, CustomSection, ProjectSection } from '../../types/portfolio'

type ActionKind = 'preview' | 'export' | 'publish'

type ActionState =
  | { kind: 'idle' }
  | { kind: 'busy'; action: ActionKind }
  | { kind: 'success'; action: ActionKind; message: string }
  | { kind: 'error'; action: ActionKind; message: string }

const ACTION_LABELS: Record<ActionKind, string> = {
  preview: 'Preview',
  export: 'Export',
  publish: 'Publish',
}

const ACTION_BUSY_LABELS: Record<ActionKind, string> = {
  preview: 'Previewing…',
  export: 'Exporting…',
  publish: 'Publishing…',
}

const ACTION_SUCCESS_MESSAGES: Record<ActionKind, string> = {
  preview: 'Preview opened',
  export: 'Exported',
  publish: 'Published',
}

const SUCCESS_AUTOCLEAR_MS = 3000

const SECTION_DEFAULTS: {
  about: Omit<AboutSection, 'id'>
  gallery: Omit<GallerySection, 'id'>
  videos: Omit<VideosSection, 'id'>
  models: Omit<ModelsSection, 'id'>
  games: Omit<GamesSection, 'id'>
  code: Omit<CodeSection, 'id'>
  custom: Omit<CustomSection, 'id'>
  project: Omit<ProjectSection, 'id'>
} = {
  about:   { type: 'about',   title: 'About Me',      visible: true, bio: '' },
  gallery: { type: 'gallery', title: 'Gallery',        visible: true, items: [] },
  videos:  { type: 'videos',  title: 'Videos',         visible: true, items: [] },
  models:  { type: 'models',  title: '3D Models',      visible: true, items: [] },
  games:   { type: 'games',   title: 'Games',          visible: true, items: [] },
  code:    { type: 'code',    title: 'Code',           visible: true, items: [] },
  custom:  { type: 'custom',  title: 'Custom Section', visible: true, html: '' },
  project: { type: 'project', title: 'Project',        visible: true, description: '', items: [] },
}

const SECTION_LABELS: Record<SectionType, string> = {
  about: '👤 About Me', gallery: '🖼 Gallery', videos: '🎬 Videos',
  models: '📦 3D Models', games: '🎮 Games', code: '💻 Code', custom: '📝 Custom',
  project: '📋 Project',
}

interface Props {
  activeSectionId: string | null
  onSelectSection: (id: string) => void
}

export function Sidebar({ activeSectionId, onSelectSection }: Props) {
  const { state, updatePortfolio } = usePortfolio()
  const [adding, setAdding] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [actionState, setActionState] = useState<ActionState>({ kind: 'idle' })
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const portfolio = state.portfolio!

  useEffect(() => () => {
    if (successTimer.current !== null) clearTimeout(successTimer.current)
  }, [])

  async function runAction(action: ActionKind, fn: () => Promise<void>) {
    if (actionState.kind === 'busy') return
    if (successTimer.current !== null) {
      clearTimeout(successTimer.current)
      successTimer.current = null
    }
    setActionState({ kind: 'busy', action })
    try {
      await fn()
      setActionState({ kind: 'success', action, message: ACTION_SUCCESS_MESSAGES[action] })
      successTimer.current = setTimeout(() => {
        setActionState(s => (s.kind === 'success' && s.action === action ? { kind: 'idle' } : s))
        successTimer.current = null
      }, SUCCESS_AUTOCLEAR_MS)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setActionState({ kind: 'error', action, message })
    }
  }

  const isBusy = actionState.kind === 'busy'
  const busyAction = isBusy ? actionState.action : null

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = portfolio.sections.findIndex(s => s.id === active.id)
    const newIndex = portfolio.sections.findIndex(s => s.id === over.id)
    updatePortfolio({ ...portfolio, sections: arrayMove(portfolio.sections, oldIndex, newIndex) })
  }

  function handleToggleVisible(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s),
    })
  }

  function handleAddSection(type: SectionType) {
    const id = `${type}-${Date.now()}`
    const newSection = { ...SECTION_DEFAULTS[type], id } as Section
    updatePortfolio({ ...portfolio, sections: [...portfolio.sections, newSection] })
    onSelectSection(id)
    setAdding(false)
  }

  return (
    <div style={{ width: 220, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={portfolio.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {portfolio.sections.map(section => (
              <SidebarItem
                key={section.id}
                section={section}
                active={section.id === activeSectionId}
                onClick={() => onSelectSection(section.id)}
                onToggleVisible={() => handleToggleVisible(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {adding ? (
          <div style={{ padding: '8px 4px' }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6, paddingLeft: 4 }}>Add section type:</div>
            {(Object.keys(SECTION_DEFAULTS) as SectionType[]).map(type => (
              <div
                key={type}
                onClick={() => handleAddSection(type)}
                style={{ padding: '7px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {SECTION_LABELS[type]}
              </div>
            ))}
            <button
              onClick={() => setAdding(false)}
              style={{ marginTop: 4, fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', paddingLeft: 10 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{ width: '100%', marginTop: 8, padding: '8px 10px', background: 'none', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', color: '#aaa', fontSize: 12, textAlign: 'left' }}
          >
            + Add section
          </button>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setShowSnapshots(true)}
          disabled={isBusy}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontSize: 12, background: 'white', opacity: isBusy ? 0.6 : 1 }}
        >
          History
        </button>
        <button
          onClick={() => state.portfolioDir && runAction('preview',
            () => window.api.previewSite(state.portfolioDir!, portfolio))}
          disabled={isBusy}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontSize: 12, background: 'white', opacity: isBusy ? 0.6 : 1 }}
        >
          {busyAction === 'preview' ? ACTION_BUSY_LABELS.preview : ACTION_LABELS.preview}
        </button>
        <button
          onClick={() => state.portfolioDir && runAction('export',
            () => window.api.exportSite(state.portfolioDir!, portfolio))}
          disabled={isBusy}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontSize: 12, background: 'white', opacity: isBusy ? 0.6 : 1 }}
        >
          {busyAction === 'export' ? ACTION_BUSY_LABELS.export : ACTION_LABELS.export}
        </button>
        <button
          onClick={() => {
            if (!state.portfolioDir || !portfolio.publish.ftp) return
            runAction('publish', () =>
              window.api.publishFtp(state.portfolioDir!, portfolio.publish.ftp!))
          }}
          disabled={isBusy}
          style={{ padding: '7px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isBusy ? 0.6 : 1 }}
        >
          {busyAction === 'publish' ? ACTION_BUSY_LABELS.publish : ACTION_LABELS.publish}
        </button>

        {actionState.kind !== 'idle' && actionState.kind !== 'busy' && (
          <div
            data-testid="action-status"
            role="status"
            aria-live="polite"
            style={{
              fontSize: 11,
              padding: '6px 8px',
              borderRadius: 4,
              background: actionState.kind === 'error' ? '#fff5f5' : '#f0fdf4',
              color: actionState.kind === 'error' ? '#9b2c2c' : '#276749',
              border: `1px solid ${actionState.kind === 'error' ? '#fbd5d5' : '#c6f6d5'}`,
              wordBreak: 'break-word',
            }}
          >
            {actionState.kind === 'error'
              ? `${ACTION_LABELS[actionState.action]} failed: ${actionState.message}`
              : actionState.message}
          </div>
        )}
      </div>
      {showSnapshots && <SnapshotPanel onClose={() => setShowSnapshots(false)} />}
    </div>
  )
}
