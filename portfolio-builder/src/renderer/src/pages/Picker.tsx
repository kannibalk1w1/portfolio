import { useEffect, useState } from 'react'
import { usePortfolio } from '../store/PortfolioContext'
import type { CypMeta, Portfolio, AboutSection } from '../types/portfolio'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function makeDefaultPortfolio(name: string): Portfolio {
  const slug = slugify(name)
  const aboutSection: AboutSection = {
    id: 'about',
    type: 'about',
    title: 'About Me',
    visible: true,
    bio: '',
  }
  return {
    schemaVersion: 1,
    name,
    slug,
    sections: [aboutSection],
    publish: {},
  }
}

export function Picker() {
  const { state, openPortfolio, setRoot } = usePortfolio()
  const [cyps, setCyps] = useState<CypMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let root = state.portfoliosRoot
        if (!root) {
          root = await window.api.getPortfoliosRoot()
          await setRoot(root)
        }
        const list = await window.api.listCyps(root)
        setCyps(list)
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
    if (!trimmed || !state.portfoliosRoot) return
    const portfolio = makeDefaultPortfolio(trimmed)
    await window.api.writePortfolio(state.portfoliosRoot, portfolio)
    setNewName('')
    setCreating(false)
    const updated = await window.api.listCyps(state.portfoliosRoot)
    setCyps(updated)
  }

  async function handleChangeFolder() {
    const folder = await window.api.openFolderPicker()
    if (folder) await setRoot(folder)
  }

  async function handleDelete(slug: string) {
    if (!state.portfoliosRoot) return
    await window.api.deletePortfolio(state.portfoliosRoot, slug)
    setConfirmingDelete(null)
    const updated = await window.api.listCyps(state.portfoliosRoot)
    setCyps(updated)
  }

  return (
    <div style={{ padding: 32, maxWidth: 480, margin: '48px auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>CYP Portfolios</h1>
      <button
        onClick={handleChangeFolder}
        style={{ fontSize: 12, marginBottom: 24, background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        📁 {state.portfoliosRoot || 'Loading…'}
      </button>

      {loading ? (
        <div style={{ color: '#aaa', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {error && (
            <div style={{ color: '#e94560', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          {cyps.map(cyp => (
            confirmingDelete === cyp.slug ? (
              <div
                key={cyp.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: '#fff5f5',
                  border: '1px solid #fbd5d5',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <span style={{ flex: 1 }}>
                  Delete <strong>{cyp.name}</strong>? This cannot be undone.
                </span>
                <button
                  onClick={() => handleDelete(cyp.slug)}
                  style={{ padding: '6px 12px', background: '#c53030', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(null)}
                  style={{ padding: '6px 10px', background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                key={cyp.slug}
                style={{ display: 'flex', alignItems: 'stretch', background: '#f8f9fa', borderRadius: 6, overflow: 'hidden' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f8f9fa')}
              >
                <button
                  onClick={() => openPortfolio(cyp.slug)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                    textAlign: 'left',
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{cyp.name}</span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {new Date(cyp.lastModified).toLocaleDateString()}
                  </span>
                </button>
                <button
                  onClick={() => setConfirmingDelete(cyp.slug)}
                  aria-label={`Delete ${cyp.name}`}
                  title={`Delete ${cyp.name}`}
                  style={{
                    padding: '0 12px',
                    background: 'transparent',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: '1px solid transparent',
                    cursor: 'pointer',
                    color: '#aaa',
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#c53030'; e.currentTarget.style.borderLeftColor = '#e0e0e0' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderLeftColor = 'transparent' }}
                >
                  ×
                </button>
              </div>
            )
          ))}

          {creating ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="CYP name"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}
              />
              <button
                onClick={handleCreate}
                style={{ padding: '8px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                style={{ padding: '8px 12px', background: 'none', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{ marginTop: 8, padding: '10px 14px', background: 'none', border: '1px dashed #ccc', borderRadius: 6, cursor: 'pointer', color: '#999', fontSize: 13, textAlign: 'left' }}
            >
              + Add new CYP
            </button>
          )}
        </div>
      )}
    </div>
  )
}
