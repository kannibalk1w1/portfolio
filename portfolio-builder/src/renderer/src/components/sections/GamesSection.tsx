import { useState, useRef } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { GamesSection as GamesSectionType, GameItem, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'

export function GamesSection({ section }: { section: GamesSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [pendingTitle, setPendingTitle] = useState('')
  const [importing, setImporting] = useState(false)
  const pendingFolderRef = useRef<string | null>(null)

  function updateSection(patch: Partial<GamesSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  async function handleImportGodot() {
    const folder = await window.api.openFolderPicker().catch(() => null)
    if (!folder) return
    pendingFolderRef.current = folder
    setImporting(true)
    setPendingTitle('')
  }

  async function confirmImport() {
    const folder = pendingFolderRef.current
    if (!folder) return
    const title = pendingTitle.trim() || 'Game'
    try {
      const folderName = await window.api.importGodotFolder(state.portfolioDir!, folder, title)
      const newItem: GameItem = {
        id: `game-${Date.now()}`,
        folderName,
        title,
        entryFile: 'index.html',
      }
      updateSection({ items: [...section.items, newItem] })
    } catch (err) {
      console.error('Failed to import Godot folder:', err)
    } finally {
      setImporting(false)
      setPendingTitle('')
      pendingFolderRef.current = null
    }
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  function updateEntryFile(id: string, entryFile: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, entryFile } : i) })
  }

  return (
    <div>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <RichTextEditor
          key={section.id}
          content={section.description ?? ''}
          onChange={description => updateSection({ description })}
          minHeight={80}
          placeholder="Add a description for this section…"
          onInsertImage={onInsertImage}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ padding: '12px 16px', background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>🎮</span>
              <span style={{ fontWeight: 500, flex: 1 }}>{item.title}</span>
              <button
                onClick={() => removeItem(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
                aria-label={`Remove ${item.title}`}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
              Folder: assets/{item.folderName}/
            </div>
            <label style={{ fontSize: 12, color: '#666' }}>
              Entry file:&nbsp;
              <input
                value={item.entryFile}
                onChange={e => updateEntryFile(item.id, e.target.value)}
                style={{ padding: '3px 6px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 12, width: 160 }}
              />
            </label>
          </div>
        ))}
      </div>

      {importing ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            autoFocus
            value={pendingTitle}
            onChange={e => setPendingTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmImport(); if (e.key === 'Escape') setImporting(false) }}
            placeholder="Game title"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
          />
          <button
            onClick={confirmImport}
            style={{ padding: '8px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Import
          </button>
          <button
            onClick={() => setImporting(false)}
            style={{ padding: '8px 12px', background: 'none', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={handleImportGodot}
          style={{ padding: '10px 20px', border: '1px dashed #ddd', borderRadius: 8, cursor: 'pointer', background: 'none', color: '#888', fontSize: 13 }}
        >
          + Import Godot HTML5 export folder
        </button>
      )}
    </div>
  )
}
