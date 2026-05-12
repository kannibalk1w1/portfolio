import { useState, useEffect, useRef } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePortfolio } from '../../store/PortfolioContext'
import type { ModelsSection as ModelsSectionType, ModelItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'
import { toFileUrl } from '../../utils/fileUrl'

function LazyModelViewer({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', height: '260px', background: '#f0f0f0', borderRadius: 4 }}>
      {visible && (
        /* @ts-ignore */
        <model-viewer
          src={src}
          alt={alt}
          auto-rotate
          camera-controls
          style={{ width: '100%', height: '260px', display: 'block' }}
        />
      )}
    </div>
  )
}

// model-viewer captures pointer events so we use an explicit ⠿ drag handle
function SortableModelItem({
  item, portfolioDir, onRemove, onLabelChange,
}: {
  item: ModelItem
  portfolioDir: string
  onRemove: () => void
  onLabelChange: (label: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}
    >
      <LazyModelViewer
        src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
        alt={item.label ?? item.filename}
      />
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc', fontSize: 18, flexShrink: 0, lineHeight: 1, padding: '0 2px' }}
          title="Drag to reorder"
        >⠿</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{item.filename}</div>
          <input
            onPointerDown={e => e.stopPropagation()}
            value={item.label ?? ''}
            onChange={e => onLabelChange(e.target.value)}
            placeholder="Label (optional)"
            style={{ width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
          aria-label={`Remove ${item.filename}`}
        >×</button>
      </div>
    </div>
  )
}

export function ModelsSection({ section }: { section: ModelsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [importError, setImportError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = section.items.findIndex(i => i.id === active.id)
        const newIndex = section.items.findIndex(i => i.id === over.id)
        updateSection({ items: arrayMove(section.items, oldIndex, newIndex) })
      }}>
        <SortableContext items={section.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {section.items.map(item => (
              <SortableModelItem
                key={item.id}
                item={item}
                portfolioDir={state.portfolioDir!}
                onRemove={() => removeItem(item.id)}
                onLabelChange={label => updateLabel(item.id, label)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
      <MediaDropzone
        label="Click to add 3D models (GLB, GLTF, FBX, STL, 3DS, OBJ, PLY)"
        filters={[{ name: '3D Models', extensions: ['glb', 'gltf', 'fbx', 'stl', '3ds', 'obj', 'ply'] }]}
        onFiles={handleImport}
      />
    </div>
  )
}
