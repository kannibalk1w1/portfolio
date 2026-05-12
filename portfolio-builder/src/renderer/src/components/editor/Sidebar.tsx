import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { usePortfolio } from '../../store/PortfolioContext'
import { SidebarItem } from './SidebarItem'
import { SnapshotPanel } from '../shared/SnapshotPanel'
import { FtpModal } from '../shared/FtpModal'
import type { NotifyFn } from '../shared/Toaster'
import type { Section, SectionType, AboutSection, GallerySection, VideosSection, ModelsSection, GamesSection, CodeSection, CustomSection, ProjectSection, LinksSection, SkillsSection, TimelineSection, QuoteSection, EmbedSection, ContentSection, StatsSection, ButtonsSection } from '../../types/portfolio'

const SECTION_DEFAULTS: {
  about: Omit<AboutSection, 'id'>
  gallery: Omit<GallerySection, 'id'>
  videos: Omit<VideosSection, 'id'>
  models: Omit<ModelsSection, 'id'>
  games: Omit<GamesSection, 'id'>
  code: Omit<CodeSection, 'id'>
  custom: Omit<CustomSection, 'id'>
  project: Omit<ProjectSection, 'id'>
  links: Omit<LinksSection, 'id'>
  skills: Omit<SkillsSection, 'id'>
  timeline: Omit<TimelineSection, 'id'>
  quote: Omit<QuoteSection, 'id'>
  embed: Omit<EmbedSection, 'id'>
  content: Omit<ContentSection, 'id'>
  stats: Omit<StatsSection, 'id'>
  buttons: Omit<ButtonsSection, 'id'>
} = {
  about:    { type: 'about',    title: 'About Me',   visible: true, bio: '' },
  gallery:  { type: 'gallery',  title: 'Gallery',    visible: true, items: [] },
  videos:   { type: 'videos',   title: 'Videos',     visible: true, items: [] },
  models:   { type: 'models',   title: '3D Models',  visible: true, items: [] },
  games:    { type: 'games',    title: 'Games',      visible: true, items: [] },
  code:     { type: 'code',     title: 'Code',       visible: true, items: [] },
  custom:   { type: 'custom',   title: 'Text',       visible: true, html: '' },
  project:  { type: 'project',  title: 'Project',    visible: true, description: '', items: [] },
  links:    { type: 'links',    title: 'Links',      visible: true, items: [] },
  skills:   { type: 'skills',   title: 'Skills',     visible: true, items: [] },
  timeline: { type: 'timeline', title: 'Timeline',   visible: true, items: [] },
  quote:    { type: 'quote',    title: 'Quote',      visible: true, items: [] },
  embed:    { type: 'embed',    title: 'Embed',      visible: true, url: '', height: 400 },
  content:  { type: 'content',  title: 'Content',    visible: true, blocks: [] },
  stats:    { type: 'stats',    title: 'Stats',      visible: true, items: [] },
  buttons:  { type: 'buttons',  title: 'Buttons',    visible: true, items: [] },
}

const SECTION_LABELS: Record<SectionType, string> = {
  about: '👤 About Me', gallery: '🖼 Gallery', videos: '🎬 Videos',
  models: '📦 3D Models', games: '🎮 Games', code: '💻 Code', custom: '📝 Text',
  project: '📋 Project', links: '🔗 Links', skills: '⭐ Skills', timeline: '📅 Timeline',
  quote: '❝ Quote', embed: '📡 Embed', content: '🧩 Content',
  stats: '📊 Stats', buttons: '🔘 Buttons',
}

interface Props {
  activeSectionId: string | null
  onSelectSection: (id: string) => void
  notify: NotifyFn
}

export function Sidebar({ activeSectionId, onSelectSection, notify }: Props) {
  const { state, updatePortfolio } = usePortfolio()
  const [adding, setAdding] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showFtp, setShowFtp] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)  // tracks which button is in-flight

  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(label)
    try {
      await fn()
    } catch (err) {
      notify(err instanceof Error ? err.message : `${label} failed`, 'error')
    } finally {
      setBusy(null)
    }
  }
  const portfolio = state.portfolio!

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

  function handleToggleNav(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, showInNav: s.showInNav === false ? undefined : false } : s
      ),
    })
  }

  function handleToggleSubPage(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, isSubPage: !s.isSubPage } : s
      ),
    })
  }

  function handleToggleGap(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, removeGapAbove: !s.removeGapAbove } : s
      ),
    })
  }

  function handleDelete(id: string) {
    const remaining = portfolio.sections.filter(s => s.id !== id)
    updatePortfolio({ ...portfolio, sections: remaining })
    // If the deleted section was selected, move focus to the first remaining section
    if (activeSectionId === id) {
      onSelectSection(remaining[0]?.id ?? null)
    }
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
                onToggleNav={() => handleToggleNav(section.id)}
                onToggleSubPage={() => handleToggleSubPage(section.id)}
                onToggleGap={() => handleToggleGap(section.id)}
                onDelete={() => handleDelete(section.id)}
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
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'white' }}
        >
          History
        </button>
        <button
          onClick={() => run('Preview', () => window.api.previewSite(state.portfolioDir!, portfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Preview' ? 0.6 : 1 }}
        >
          {busy === 'Preview' ? 'Opening…' : 'Preview'}
        </button>
        <button
          onClick={() => run('Mobile', () => window.api.previewMobile(state.portfolioDir!, portfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Mobile' ? 0.6 : 1 }}
        >
          {busy === 'Mobile' ? 'Opening…' : '📱 Mobile'}
        </button>
        <button
          onClick={() => run('Export', () => window.api.exportSite(state.portfolioDir!, portfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Export' ? 0.6 : 1 }}
        >
          {busy === 'Export' ? 'Exporting…' : 'Export'}
        </button>
        <button
          onClick={() => run('ZIP', () => window.api.zipExport(state.portfolioDir!, portfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'ZIP' ? 0.6 : 1 }}
        >
          {busy === 'ZIP' ? 'Zipping…' : 'Export ZIP'}
        </button>
        <button
          onClick={() => run('Offline', () => window.api.offlineExport(state.portfolioDir!, portfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Offline' ? 0.6 : 1 }}
        >
          {busy === 'Offline' ? 'Exporting…' : 'Offline'}
        </button>
        <button
          onClick={() => setShowFtp(true)}
          style={{ padding: '7px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Publish…
        </button>
      </div>
      {showSnapshots && <SnapshotPanel onClose={() => setShowSnapshots(false)} />}
      {showFtp && <FtpModal onClose={() => setShowFtp(false)} />}
    </div>
  )
}
