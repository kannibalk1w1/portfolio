import { useEffect, useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { usePortfolio } from '../../store/PortfolioContext'
import { SidebarItem } from './SidebarItem'
import { SnapshotPanel } from '../shared/SnapshotPanel'
import { FtpModal } from '../shared/FtpModal'
import type { NotifyFn } from '../shared/Toaster'
import { checkPortfolioReadiness } from '../../lib/readiness/checkPortfolioReadiness'
import type { Portfolio, Section, SectionType, AboutSection, GallerySection, VideosSection, ModelsSection, GamesSection, CodeSection, CustomSection, ProjectSection, LinksSection, SkillsSection, TimelineSection, QuoteSection, EmbedSection, ContentSection, StatsSection, ButtonsSection, BlueprintsSection } from '../../types/portfolio'
import type { OutputSummary } from '../../types/output'

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
  blueprints: Omit<BlueprintsSection, 'id'>
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
  buttons:    { type: 'buttons',    title: 'Buttons',     visible: true, items: [] },
  blueprints: { type: 'blueprints', title: 'Blueprints', visible: true, items: [] },
}

const SECTION_LABELS: Record<SectionType, string> = {
  about: '👤 About Me', gallery: '🖼 Gallery', videos: '🎬 Videos',
  models: '📦 3D Models', games: '🎮 Games', code: '💻 Code', custom: '📝 Text',
  project: '📋 Project', links: '🔗 Links', skills: '⭐ Skills', timeline: '📅 Timeline',
  quote: '❝ Quote', embed: '📡 Embed', content: '🧩 Content',
  stats: '📊 Stats', buttons: '🔘 Buttons', blueprints: '⬡ Blueprints',
}

interface Props {
  activeSectionId: string | null
  onSelectSection: (id: string) => void
  notify: NotifyFn
}

export function Sidebar({ activeSectionId, onSelectSection, notify }: Props) {
  const { state, updatePortfolio, savePortfolio } = usePortfolio()
  const [adding, setAdding] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showFtp, setShowFtp] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)  // tracks which button is in-flight
  const [assetFilenames, setAssetFilenames] = useState<Set<string> | undefined>(undefined)
  const [pendingReadinessAction, setPendingReadinessAction] = useState<{
    label: string
    fn: (portfolio: Portfolio) => Promise<OutputSummary | undefined | void>
    saveBeforeRun?: boolean
  } | null>(null)

  const portfolio = state.portfolio!

  useEffect(() => {
    let cancelled = false
    if (!state.portfolioDir || !window.api.listAssets) {
      setAssetFilenames(undefined)
      return
    }
    window.api.listAssets(state.portfolioDir)
      .then(files => { if (!cancelled) setAssetFilenames(new Set(files)) })
      .catch(() => { if (!cancelled) setAssetFilenames(undefined) })
    return () => { cancelled = true }
  }, [state.portfolioDir, state.portfolio])

  async function run(label: string, fn: (portfolio: Portfolio) => Promise<OutputSummary | undefined | void>, opts: { confirmReadiness?: boolean; saveBeforeRun?: boolean } = {}) {
    if (busy) return
    const latestPortfolio = state.portfolio!
    if (opts.confirmReadiness) {
      const readiness = checkPortfolioReadiness(latestPortfolio, { assetFilenames })
      if (readiness.errorCount > 0) {
        setPendingReadinessAction({ label, fn, saveBeforeRun: opts.saveBeforeRun })
        return
      }
    }
    setBusy(label)
    try {
      if (opts.saveBeforeRun) {
        await savePortfolio(latestPortfolio, { snapshot: false })
      }
      const summary = await fn(latestPortfolio)
      if (summary) {
        notify(`${label} ready: ${formatOutputSummary(summary)}.`, 'success')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      notify(`${label} failed: ${message}`, 'error')
    } finally {
      setBusy(null)
    }
  }
  async function confirmPendingReadinessAction() {
    const action = pendingReadinessAction
    if (!action) return
    setPendingReadinessAction(null)
    await run(action.label, action.fn, { saveBeforeRun: action.saveBeforeRun })
  }

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
          disabled={busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12, background: 'white', opacity: busy !== null ? 0.6 : 1 }}
        >
          History
        </button>
        <button
          onClick={() => run('Preview', latestPortfolio => window.api.previewSite(state.portfolioDir!, latestPortfolio), { confirmReadiness: true, saveBeforeRun: true })}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Preview' ? 0.6 : 1 }}
        >
          {busy === 'Preview' ? 'Opening…' : 'Preview'}
        </button>
        <button
          onClick={() => run('Mobile', latestPortfolio => window.api.previewMobile(state.portfolioDir!, latestPortfolio))}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Mobile' ? 0.6 : 1 }}
        >
          {busy === 'Mobile' ? 'Opening…' : '📱 Mobile'}
        </button>
        <button
          onClick={() => run('Export', latestPortfolio => window.api.exportSite(state.portfolioDir!, latestPortfolio), { confirmReadiness: true, saveBeforeRun: true })}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Export' ? 0.6 : 1 }}
        >
          {busy === 'Export' ? 'Exporting…' : 'Export'}
        </button>
        <button
          onClick={() => run('ZIP', latestPortfolio => window.api.zipExport(state.portfolioDir!, latestPortfolio), { saveBeforeRun: true })}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'ZIP' ? 0.6 : 1 }}
        >
          {busy === 'ZIP' ? 'Zipping…' : 'Export ZIP'}
        </button>
        <button
          onClick={() => run('Offline', latestPortfolio => window.api.offlineExport(state.portfolioDir!, latestPortfolio), { saveBeforeRun: true })}
          disabled={!state.portfolioDir || busy !== null}
          style={{ padding: '7px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 12, background: 'white', opacity: busy === 'Offline' ? 0.6 : 1 }}
        >
          {busy === 'Offline' ? 'Exporting…' : 'Offline'}
        </button>
        <button
          onClick={() => {
            const readiness = checkPortfolioReadiness(portfolio, { assetFilenames })
            if (readiness.errorCount > 0) {
              setPendingReadinessAction({ label: 'Publish', fn: async () => setShowFtp(true) })
              return
            }
            setShowFtp(true)
          }}
          style={{ padding: '7px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Publish…
        </button>
      </div>
      {showSnapshots && <SnapshotPanel onClose={() => setShowSnapshots(false)} />}
      {showFtp && <FtpModal onClose={() => setShowFtp(false)} />}
      {pendingReadinessAction && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setPendingReadinessAction(null) }}
        >
          <div style={{ background: 'white', borderRadius: 10, padding: 20, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Readiness issues found</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              {formatBlockingIssues(checkPortfolioReadiness(portfolio, { assetFilenames }).errorCount)} found. You can continue, but it is worth checking Readiness first.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setPendingReadinessAction(null)}
                style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingReadinessAction}
                style={{ padding: '7px 12px', border: 'none', borderRadius: 6, background: '#222', color: 'white', cursor: 'pointer', fontSize: 13 }}
              >
                {pendingReadinessAction.label} anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBlockingIssues(count: number): string {
  return `${count} blocking readiness ${count === 1 ? 'issue' : 'issues'}`
}

function formatOutputSummary(summary: OutputSummary): string {
  return [
    `${summary.htmlFiles} ${summary.htmlFiles === 1 ? 'page' : 'pages'}`,
    `${summary.visibleSections} visible ${summary.visibleSections === 1 ? 'section' : 'sections'}`,
    `${summary.assetFiles} ${summary.assetFiles === 1 ? 'asset' : 'assets'}`,
  ].join(', ')
}
