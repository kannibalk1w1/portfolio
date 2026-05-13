import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { NotifyFn } from '../shared/Toaster'
import { HelpModal } from '../shared/HelpModal'

interface Props {
  notify: NotifyFn
  autosaving: boolean
}

function SaveStatus({ dirty, autosaving, lastSaved }: { dirty: boolean; autosaving: boolean; lastSaved: Date | null }) {
  if (autosaving) {
    return <span style={{ fontSize: 11, color: '#94a3b8' }}>Auto-saving…</span>
  }
  if (dirty) {
    return <span style={{ fontSize: 11, color: '#e94560' }}>Unsaved changes</span>
  }
  if (lastSaved) {
    return <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Saved</span>
  }
  return null
}

export function TopBar({ notify, autosaving }: Props) {
  const { state, closePortfolio, savePortfolio } = usePortfolio()
  const [saving, setSaving] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await savePortfolio()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #e0e0e0',
        background: 'white',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={closePortfolio}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13 }}
          >
            ← Back
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{state.portfolio?.name}</span>
          <SaveStatus dirty={state.dirty} autosaving={autosaving} lastSaved={state.lastSaved} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="Section guide"
            title="Section guide"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid #d0d0d0', background: 'none',
              cursor: 'pointer', color: '#666', fontSize: 13,
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >?</button>
          <button
            onClick={handleSave}
            disabled={saving || autosaving}
            title="Save and create a version snapshot"
            style={{ padding: '6px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: saving || autosaving ? 'wait' : 'pointer', fontSize: 13, opacity: saving || autosaving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  )
}
