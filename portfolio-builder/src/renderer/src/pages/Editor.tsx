import { useState, Suspense } from 'react'
import { TopBar } from '../components/editor/TopBar'
import { Sidebar } from '../components/editor/Sidebar'
import { usePortfolio } from '../store/PortfolioContext'

export function Editor() {
  const { state } = usePortfolio()
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    state.portfolio?.sections[0]?.id ?? null
  )

  const activeSection = state.portfolio?.sections.find(s => s.id === activeSectionId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeSectionId={activeSectionId} onSelectSection={setActiveSectionId} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <Suspense fallback={<div style={{ color: '#aaa' }}>Loading…</div>}>
            {activeSection ? (
              <div style={{ color: '#aaa', fontSize: 14 }}>
                Section editor for <strong>{activeSection.title}</strong> will be available after Task 10.
              </div>
            ) : (
              <div style={{ color: '#aaa', fontSize: 14 }}>Select a section from the sidebar.</div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
