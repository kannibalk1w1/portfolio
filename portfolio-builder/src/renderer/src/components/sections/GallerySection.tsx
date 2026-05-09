import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { GallerySection as GallerySectionType, MediaItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { toFileUrl } from '../../utils/fileUrl'

export function GallerySection({ section }: { section: GallerySectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const [importError, setImportError] = useState<string | null>(null)

  function updateSection(patch: Partial<GallerySectionType>) {
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
      const newItems: MediaItem[] = filenames.map(filename => ({
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

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f0f0f0', aspectRatio: '1' }}>
            <img
              src={toFileUrl(`${state.portfolioDir}/assets/${item.filename}`)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              alt={item.caption ?? item.filename}
            />
            <button
              onClick={() => removeItem(item.id)}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={`Remove ${item.filename}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add images or GIFs"
        filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
