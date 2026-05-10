import { useEffect, useState } from 'react'
import { usePortfolio } from '../store/PortfolioContext'
import type { CypMeta, Portfolio, AboutSection } from '../types/portfolio'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function makeDefaultPortfolio(name: string): Portfolio {
  const slug = slugify(name)
  const aboutSection: AboutSection = {
    id: 'about', type: 'about', title: 'About Me', visible: true, bio: '',
  }
  return { schemaVersion: 1, name, slug, theme: 'launchpad', sections: [aboutSection], publish: {} }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#0ea5e9', '#f97316', '#14b8a6',
]
function avatarColour(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length]
}

function friendlyDate(iso: string): string {
  const date = new Date(iso)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CypCard({ cyp, onOpen, onDelete }: { cyp: CypMeta; onOpen: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const colour = avatarColour(cyp.name)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        background: hovered ? '#f5f7ff' : 'white',
        borderRadius: 10,
        border: `1px solid ${hovered ? '#c7d2fe' : '#e8eaf0'}`,
        boxShadow: hovered ? '0 2px 8px rgba(99,102,241,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
      onClick={onOpen}
    >
      {/* Initials avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: colour, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 15, flexShrink: 0,
        letterSpacing: '0.03em',
      }}>
        {getInitials(cyp.name)}
      </div>

      {/* Name + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cyp.name}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
          {friendlyDate(cyp.lastModified)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            title="Delete portfolio"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#cbd5e1', fontSize: 16, padding: '2px 4px',
              borderRadius: 4, lineHeight: 1,
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
            onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}
          >
            ×
          </button>
        )}
        <span style={{ color: hovered ? '#6366f1' : '#cbd5e1', fontSize: 18, transition: 'color 0.15s' }}>›</span>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        No portfolios yet
      </h2>
      <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
        Create a portfolio for a CYP to get started.
      </p>
      <button
        onClick={onCreate}
        style={{
          padding: '10px 24px', background: '#6366f1', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}
      >
        Create first portfolio
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Picker
// ---------------------------------------------------------------------------

export function Picker() {
  const { state, openPortfolio, setRoot } = usePortfolio()
  const [cyps, setCyps] = useState<CypMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let root = state.portfoliosRoot
        if (!root) { root = await window.api.getPortfoliosRoot(); await setRoot(root) }
        setCyps(await window.api.listCyps(root))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolios')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [state.portfoliosRoot])

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed || !state.portfoliosRoot || saving) return
    setSaving(true)
    try {
      await window.api.writePortfolio(state.portfoliosRoot, makeDefaultPortfolio(trimmed))
      setNewName('')
      setCreating(false)
      setCyps(await window.api.listCyps(state.portfoliosRoot))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slug: string, name: string) {
    if (!confirm(`Delete ${name}'s portfolio? This cannot be undone.`)) return
    try {
      await window.api.deletePortfolio(state.portfoliosRoot, slug)
      setCyps(prev => prev.filter(c => c.slug !== slug))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleChangeFolder() {
    const folder = await window.api.openFolderPicker()
    if (folder) await setRoot(folder)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9' }}>

      {/* ── Header ── */}
      <header style={{
        background: '#0f172a', padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🚀</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Launchpad</span>
        </div>
        <button
          onClick={handleChangeFolder}
          title="Change portfolios folder"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            maxWidth: 280, overflow: 'hidden',
          }}
        >
          <span>📁</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.portfoliosRoot || 'Loading…'}
          </span>
        </button>
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Section heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Portfolios</h1>
            {!creating && cyps.length > 0 && (
              <button
                onClick={() => setCreating(true)}
                style={{
                  padding: '7px 16px', background: '#6366f1', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                + New
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #e94560', borderLeft: '4px solid #e94560', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e94560', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
              Loading…
            </div>
          ) : cyps.length === 0 && !creating ? (
            <EmptyState onCreate={() => setCreating(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cyps.map(cyp => (
                <CypCard
                  key={cyp.slug}
                  cyp={cyp}
                  onOpen={() => openPortfolio(cyp.slug)}
                  onDelete={() => handleDelete(cyp.slug, cyp.name)}
                />
              ))}

              {/* Create form */}
              {creating ? (
                <div style={{ background: 'white', border: '1px solid #c7d2fe', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', marginBottom: 10 }}>New portfolio</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                      placeholder="CYP full name"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || saving}
                      style={{ padding: '9px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 7, cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: !newName.trim() || saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewName('') }}
                      style={{ padding: '9px 14px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: '#64748b' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  style={{
                    marginTop: 4, padding: '11px 14px', background: 'none',
                    border: '2px dashed #e2e8f0', borderRadius: 10, cursor: 'pointer',
                    color: '#94a3b8', fontSize: 13, textAlign: 'left',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8' }}
                >
                  + Add new portfolio
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
