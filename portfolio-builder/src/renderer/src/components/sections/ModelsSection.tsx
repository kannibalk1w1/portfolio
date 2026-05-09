import { usePortfolio } from '../../store/PortfolioContext'
import type { ModelsSection as ModelsSectionType, ModelItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'

export function ModelsSection({ section }: { section: ModelsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<ModelsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  async function handleImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    const newItems: ModelItem[] = filenames.map(filename => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
    }))
    updateSection({ items: [...section.items, ...newItems] })
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
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8f8f8', borderRadius: 8 }}>
            <span style={{ fontSize: 28 }}>📦</span>
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
        ))}
      </div>
      <MediaDropzone
        label="Click to add 3D models (GLB, GLTF)"
        filters={[{ name: '3D Models', extensions: ['glb', 'gltf'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
