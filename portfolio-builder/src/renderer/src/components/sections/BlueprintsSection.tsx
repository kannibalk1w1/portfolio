import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePortfolio } from '../../store/PortfolioContext'
import type { BlueprintsSection as BlueprintsSectionType, BlueprintItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { SectionTitle } from '../shared/SectionTitle'
import { RichTextEditor } from '../shared/RichTextEditor'
import { useImageInserter } from '../../hooks/useImageInserter'
import { BlueprintViewer } from '../../lib/blueprint/BlueprintViewer'
import { parseUECopyText } from '../../lib/blueprint/parseUECopyText'
import { toFileUrl } from '../../utils/fileUrl'

function SortableBlueprintItem({
  item,
  portfolioDir,
  onRemove,
  onLabelChange,
}: {
  item: BlueprintItem
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
      {item.kind === 'paste' ? (
        <BlueprintViewer ueText={item.content} height={280} />
      ) : (
        <img
          src={toFileUrl(`${portfolioDir}/assets/${item.content}`)}
          alt={item.label ?? item.content}
          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: '#1a1a2e', display: 'block' }}
        />
      )}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc', fontSize: 18, flexShrink: 0, lineHeight: 1 }}
          title="Drag to reorder"
        >⠿</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
            {item.kind === 'paste' ? 'Blueprint paste' : item.content}
          </div>
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
          aria-label="Remove"
        >×</button>
      </div>
    </div>
  )
}

export function BlueprintsSection({ section }: { section: BlueprintsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [tab, setTab] = useState<'paste' | 'image'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function updateSection(patch: Partial<BlueprintsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addPaste() {
    setPasteError(null)
    if (!parseUECopyText(pasteText)) {
      setPasteError("Couldn't read this blueprint. Try copying again from the UE editor, or use a screenshot instead.")
      return
    }
    const item: BlueprintItem = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'paste',
      content: pasteText,
    }
    updateSection({ items: [...section.items, item] })
    setPasteText('')
  }

  async function handleImageImport(paths: string[]) {
    setImportError(null)
    try {
      const filenames = await window.api.importMedia(state.portfolioDir!, paths)
      const newItems: BlueprintItem[] = filenames.map(filename => ({
        id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'image' as const,
        content: filename,
      }))
      updateSection({ items: [...section.items, ...newItems] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? '#333' : '#999',
    background: active ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    cursor: 'pointer',
  })

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
          placeholder="Add a description…"
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
              <SortableBlueprintItem
                key={item.id}
                item={item}
                portfolioDir={state.portfolioDir!}
                onRemove={() => updateSection({ items: section.items.filter(i => i.id !== item.id) })}
                onLabelChange={label => updateSection({ items: section.items.map(i => i.id === item.id ? { ...i, label } : i) })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add panel */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <button style={tabStyle(tab === 'paste')} onClick={() => setTab('paste')}>Paste text</button>
          <button style={tabStyle(tab === 'image')} onClick={() => setTab('image')}>Screenshot</button>
        </div>

        {tab === 'paste' ? (
          <div style={{ padding: 12 }}>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError(null) }}
              placeholder={'Copy nodes in UE editor (Ctrl+C), then paste here…\n\nBegin Object Class=…'}
              style={{ width: '100%', height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 11, padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: 4, boxSizing: 'border-box' }}
            />
            {pasteError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 6 }}>{pasteError}</div>}
            <button
              onClick={addPaste}
              disabled={!pasteText.trim()}
              style={{ width: '100%', padding: '8px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: pasteText.trim() ? 'pointer' : 'not-allowed', opacity: pasteText.trim() ? 1 : 0.5 }}
            >
              Add blueprint
            </button>
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
            <MediaDropzone
              label="Click to add screenshot (PNG, JPG, GIF, WEBP)"
              filters={[{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]}
              onFiles={handleImageImport}
            />
          </div>
        )}
      </div>

      {section.items.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic', marginTop: 12, textAlign: 'center' }}>
          No blueprints added yet.
        </p>
      )}
    </div>
  )
}
