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
import type { GallerySection as GallerySectionType, MediaItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'
import { toFileUrl } from '../../utils/fileUrl'

// ---------------------------------------------------------------------------
// Sortable gallery item
// ---------------------------------------------------------------------------

function SortableItem({
  item, portfolioDir, onRemove, onCaptionChange,
}: {
  item: MediaItem
  portfolioDir: string
  onRemove: () => void
  onCaptionChange: (caption: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      {/* Image — acts as drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'relative', borderRadius: 8, overflow: 'hidden',
          background: '#f0f0f0', aspectRatio: '1',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <img
          src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
          alt={item.caption ?? item.filename}
          draggable={false}
        />
        <button
          onPointerDown={e => e.stopPropagation()}  // don't let remove button start a drag
          onClick={onRemove}
          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label={`Remove ${item.filename}`}
        >×</button>
      </div>

      <input
        onPointerDown={e => e.stopPropagation()}  // don't let caption input start a drag
        value={item.caption ?? ''}
        onChange={e => onCaptionChange(e.target.value)}
        placeholder="Caption…"
        style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #e0e0e0', borderRadius: 4, width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

export function GallerySection({ section }: { section: GallerySectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [importError, setImportError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function updateSection(patch: Partial<GallerySectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = section.items.findIndex(i => i.id === active.id)
    const newIndex = section.items.findIndex(i => i.id === over.id)
    updateSection({ items: arrayMove(section.items, oldIndex, newIndex) })
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
          placeholder="Add a description for this gallery…"
          onInsertImage={onInsertImage}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={section.items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {section.items.map(item => (
              <SortableItem
                key={item.id}
                item={item}
                portfolioDir={state.portfolioDir!}
                onRemove={() => updateSection({ items: section.items.filter(i => i.id !== item.id) })}
                onCaptionChange={caption => updateSection({ items: section.items.map(i => i.id === item.id ? { ...i, caption } : i) })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add images or GIFs"
        filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
