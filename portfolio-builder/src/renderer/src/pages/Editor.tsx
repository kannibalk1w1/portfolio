import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { TopBar } from '../components/editor/TopBar'
import { Sidebar } from '../components/editor/Sidebar'
import { Toaster, useToaster } from '../components/shared/Toaster'
import { usePortfolio } from '../store/PortfolioContext'
import type { SectionType } from '../types/portfolio'

const SECTION_COMPONENTS: Record<SectionType, React.LazyExoticComponent<React.ComponentType<{ section: any }>>> = {
  about:   lazy(() => import('../components/sections/AboutSection').then(m => ({ default: m.AboutSection }))),
  gallery: lazy(() => import('../components/sections/GallerySection').then(m => ({ default: m.GallerySection }))),
  videos:  lazy(() => import('../components/sections/VideosSection').then(m => ({ default: m.VideosSection }))),
  models:  lazy(() => import('../components/sections/ModelsSection').then(m => ({ default: m.ModelsSection }))),
  games:   lazy(() => import('../components/sections/GamesSection').then(m => ({ default: m.GamesSection }))),
  code:    lazy(() => import('../components/sections/CodeSection').then(m => ({ default: m.CodeSection }))),
  custom:  lazy(() => import('../components/sections/CustomSection').then(m => ({ default: m.CustomSection }))),
  project: lazy(() => import('../components/sections/ProjectSection').then(m => ({ default: m.ProjectSection }))),
  links:    lazy(() => import('../components/sections/LinksSection').then(m => ({ default: m.LinksSection }))),
  skills:   lazy(() => import('../components/sections/SkillsSection').then(m => ({ default: m.SkillsSection }))),
  timeline: lazy(() => import('../components/sections/TimelineSection').then(m => ({ default: m.TimelineSection }))),
}

const AUTO_SAVE_DELAY = 10_000  // 10 seconds after last change

export function Editor() {
  const { state, savePortfolio } = usePortfolio()
  const { toasts, notify } = useToaster()
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    state.portfolio?.sections[0]?.id ?? null
  )
  const [autosaving, setAutosaving] = useState(false)

  // Keep a stable ref to savePortfolio so the debounce closure doesn't go stale
  const saveRef = useRef(savePortfolio)
  useEffect(() => { saveRef.current = savePortfolio }, [savePortfolio])

  // Auto-save: 10 seconds after the last portfolio change, write without
  // creating a snapshot (snapshots are only created on manual Save).
  useEffect(() => {
    if (!state.dirty) return
    const timer = setTimeout(async () => {
      setAutosaving(true)
      try {
        await saveRef.current(undefined, { snapshot: false })
      } catch {
        // Auto-save failures are silent — the manual Save button remains available
      } finally {
        setAutosaving(false)
      }
    }, AUTO_SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [state.portfolio, state.dirty])

  useEffect(() => {
    const ids = state.portfolio?.sections.map(s => s.id) ?? []
    if (activeSectionId !== null && !ids.includes(activeSectionId)) {
      setActiveSectionId(ids[0] ?? null)
    }
  }, [state.portfolio?.sections])

  const activeSection = state.portfolio?.sections.find(s => s.id === activeSectionId)
  const SectionComponent = activeSection ? SECTION_COMPONENTS[activeSection.type] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar notify={notify} autosaving={autosaving} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeSectionId={activeSectionId} onSelectSection={setActiveSectionId} notify={notify} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <Suspense fallback={<div style={{ color: '#aaa' }}>Loading…</div>}>
            {SectionComponent && activeSection
              ? <SectionComponent section={activeSection} />
              : <div style={{ color: '#aaa', fontSize: 14 }}>Select a section from the sidebar.</div>
            }
          </Suspense>
        </div>
      </div>
      <Toaster toasts={toasts} />
    </div>
  )
}
