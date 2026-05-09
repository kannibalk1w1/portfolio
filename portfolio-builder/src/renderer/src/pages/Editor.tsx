import { useState, useEffect, lazy, Suspense } from 'react'
import { TopBar } from '../components/editor/TopBar'
import { Sidebar } from '../components/editor/Sidebar'
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
}

export function Editor() {
  const { state } = usePortfolio()
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    state.portfolio?.sections[0]?.id ?? null
  )

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
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeSectionId={activeSectionId} onSelectSection={setActiveSectionId} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <Suspense fallback={<div style={{ color: '#aaa' }}>Loading…</div>}>
            {SectionComponent && activeSection
              ? <SectionComponent section={activeSection} />
              : <div style={{ color: '#aaa', fontSize: 14 }}>Select a section from the sidebar.</div>
            }
          </Suspense>
        </div>
      </div>
    </div>
  )
}
