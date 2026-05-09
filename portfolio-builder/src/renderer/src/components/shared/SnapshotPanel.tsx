import { useEffect, useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { SnapshotMeta } from '../../types/portfolio'

interface Props {
  onClose: () => void
}

export function SnapshotPanel({ onClose }: Props) {
  const { state, openPortfolio } = usePortfolio()
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state.portfolioDir) return
    window.api.listSnapshots(state.portfolioDir)
      .then(snaps => { setSnapshots(snaps); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [state.portfolioDir])

  async function handleRestore(id: string) {
    if (!confirm(`Restore this version? Any unsaved changes will be lost.`)) return
    setRestoring(id)
    setError(null)
    try {
      await window.api.restoreSnapshot(state.portfolioDir!, id)
      await openPortfolio(state.openPortfolioSlug!)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
      setRestoring(null)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 400, maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Version History</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }} aria-label="Close">×</button>
        </div>

        {error && <div style={{ color: '#e94560', fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ color: '#aaa', fontSize: 13 }}>Loading…</div>
        ) : snapshots.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>No snapshots yet. Save the portfolio to create one.</p>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 13 }}>
                {new Date(snap.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleRestore(snap.id)}
                disabled={restoring === snap.id}
                style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #ddd', borderRadius: 4, cursor: restoring ? 'wait' : 'pointer', background: 'none' }}
              >
                {restoring === snap.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
