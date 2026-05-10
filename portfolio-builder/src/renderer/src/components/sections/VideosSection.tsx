import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { VideosSection as VideosSectionType, VideoItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { toFileUrl } from '../../utils/fileUrl'

async function captureThumbnail(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.currentTime = 1
    video.addEventListener('loadeddata', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }, { once: true })
    video.addEventListener('error', reject, { once: true })
  })
}

export function VideosSection({ section }: { section: VideosSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const [importError, setImportError] = useState<string | null>(null)

  function updateSection(patch: Partial<VideosSectionType>) {
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
      const newItems: VideoItem[] = filenames.map(filename => ({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        filename,
      }))
      // Attempt thumbnail capture for each video (best-effort, non-blocking)
      for (const item of newItems) {
        try {
          await captureThumbnail(
            toFileUrl(`${state.portfolioDir}/assets/${item.filename}`)
          )
          // Thumbnail data URL available — future enhancement: save to assets via IPC
          // For now we skip saving to keep this task scoped
        } catch {
          // thumbnail optional — continue without it
        }
      }
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <video
              src={toFileUrl(`${state.portfolioDir}/assets/${item.filename}`)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              controls
            />
            <button
              onClick={() => removeItem(item.id)}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}
              aria-label={`Remove ${item.filename}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add videos (MP4, WebM, MOV)"
        filters={[{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'm4v'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
