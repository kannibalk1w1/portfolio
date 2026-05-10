import { useState } from 'react'
import {
  DndContext, closestCenter, DragEndEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePortfolio } from '../../store/PortfolioContext'
import type { VideosSection as VideosSectionType, VideoItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'
import { toFileUrl } from '../../utils/fileUrl'

// ---------------------------------------------------------------------------
// Sortable video item (uses explicit drag handle — iframes capture pointer events)
// ---------------------------------------------------------------------------

function SortableVideoItem({
  item, portfolioDir, onRemove, onCaptionChange,
}: {
  item: VideoItem
  portfolioDir: string
  onRemove: () => void
  onCaptionChange: (caption: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Drag handle bar */}
      <div
        {...attributes}
        {...listeners}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 20, cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc', fontSize: 14, borderRadius: '8px 8px 0 0', background: '#f5f5f5', border: '1px solid #e8e8e8', borderBottom: 'none' }}
        title="Drag to reorder"
      >⠿</div>

      <div style={{ position: 'relative', borderRadius: '0 0 8px 8px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
        {item.embedUrl ? (
          <iframe
            src={item.embedUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allowFullScreen
            title={item.caption ?? 'Video'}
          />
        ) : (
          <video
            src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            controls
          />
        )}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onRemove}
          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
          aria-label="Remove video"
        >×</button>
      </div>
      <input
        onPointerDown={e => e.stopPropagation()}
        value={item.caption ?? ''}
        onChange={e => onCaptionChange(e.target.value)}
        placeholder="Title (optional)"
        style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 6px 6px', width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}

import { parseVideoUrl } from '../../utils/parseVideoUrl'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideosSection({ section }: { section: VideosSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [importError, setImportError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

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
      updateSection({ items: [...section.items, ...newItems] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  function handleAddUrl() {
    const embedUrl = parseVideoUrl(urlInput)
    if (!embedUrl) {
      setUrlError('Paste a valid YouTube or Vimeo link.')
      return
    }
    const newItem: VideoItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: '',   // unused for embeds
      embedUrl,
    }
    updateSection({ items: [...section.items, newItem] })
    setUrlInput('')
    setUrlError(null)
    setShowUrlInput(false)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = section.items.findIndex(i => i.id === active.id)
    const newIndex = section.items.findIndex(i => i.id === over.id)
    updateSection({ items: arrayMove(section.items, oldIndex, newIndex) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  function updateCaption(id: string, caption: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, caption } : i) })
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

      {/* Video grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={section.items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            {section.items.map(item => (
              <SortableVideoItem
                key={item.id}
                item={item}
                portfolioDir={state.portfolioDir!}
                onRemove={() => removeItem(item.id)}
                onCaptionChange={caption => updateCaption(item.id, caption)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add local video */}
      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add videos (MP4, WebM)"
        filters={[{ name: 'Videos', extensions: ['mp4', 'webm'] }]}
        onFiles={handleImport}
      />

      {/* Add YouTube / Vimeo embed */}
      <div style={{ marginTop: 10 }}>
        {showUrlInput ? (
          <div style={{ background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Paste a YouTube or Vimeo link</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); if (e.key === 'Escape') { setShowUrlInput(false); setUrlInput('') } }}
                placeholder="https://youtube.com/watch?v=…"
                style={{ flex: 1, padding: '7px 10px', border: `1px solid ${urlError ? '#e94560' : '#ddd'}`, borderRadius: 6, fontSize: 13 }}
              />
              <button
                onClick={handleAddUrl}
                style={{ padding: '7px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >Add</button>
              <button
                onClick={() => { setShowUrlInput(false); setUrlInput(''); setUrlError(null) }}
                style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}
              >Cancel</button>
            </div>
            {urlError && <div style={{ color: '#e94560', fontSize: 12, marginTop: 6 }}>{urlError}</div>}
          </div>
        ) : (
          <button
            onClick={() => setShowUrlInput(true)}
            style={{ width: '100%', padding: '8px', border: '1px dashed #ddd', borderRadius: 6, background: 'none', cursor: 'pointer', color: '#aaa', fontSize: 12 }}
          >
            + Add YouTube or Vimeo link
          </button>
        )}
      </div>
    </div>
  )
}
