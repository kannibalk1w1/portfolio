import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { ModelsSection as ModelsSectionType, ModelItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { toFileUrl } from '../../utils/fileUrl'

export function ModelsSection({ section }: { section: ModelsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const [importError, setImportError] = useState<string | null>(null)

  function updateSection(patch: Partial<ModelsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  async function handleImport(paths: string[]) {
    setImportError(null)
    try {
      const filenames = await window.api.importMedia(state.portfolioDir!, paths)
      const newItems: ModelItem[] = filenames.map(filename => ({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        filename,
      }))
      updateSection({ items: [...section.items, ...newItems] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  function updateLabel(id: string, label: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, label } : i) })
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}>
            {/* @ts-ignore — model-viewer is a custom element registered via @google/model-viewer */}
            <model-viewer
              src={toFileUrl(`${state.portfolioDir}/assets/${item.filename}`)}
              alt={item.label ?? item.filename}
              auto-rotate
              camera-controls
              style={{ width: '100%', height: '260px', display: 'block' }}
            />
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{item.filename}</div>
                <input
                  value={item.label ?? ''}
                  onChange={e => updateLabel(item.id, e.target.value)}
                  placeholder="Label (optional)"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => removeItem(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
                aria-label={`Remove ${item.filename}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add 3D models (GLB, GLTF, FBX, STL, 3DS, OBJ, PLY)"
        filters={[{ name: '3D Models', extensions: ['glb', 'gltf', 'fbx', 'stl', '3ds', 'obj', 'ply'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
