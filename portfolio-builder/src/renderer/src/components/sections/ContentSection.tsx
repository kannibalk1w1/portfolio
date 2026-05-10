/**
 * ContentSection — a free-form block editor. Each section contains an ordered
 * list of blocks of different types (Text, Image, Video, Quote, Divider) that
 * can be mixed and reordered within a single named section.
 */
import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePortfolio } from '../../store/PortfolioContext'
import type {
  ContentSection as ContentSectionType, ContentBlock, ContentTextBlock,
  ContentImageBlock, ContentVideoBlock, ContentQuoteBlock, ContentDividerBlock,
  Section,
} from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { MediaDropzone } from '../shared/MediaDropzone'
import { useImageInserter } from '../../hooks/useImageInserter'
import { toFileUrl } from '../../utils/fileUrl'
import { parseVideoUrl } from '../../utils/parseVideoUrl'

// ---------------------------------------------------------------------------
// Block type picker
// ---------------------------------------------------------------------------

const BLOCK_TYPES: { type: ContentBlock['type']; label: string; icon: string }[] = [
  { type: 'text',    label: 'Text',    icon: '📝' },
  { type: 'image',   label: 'Image',   icon: '🖼' },
  { type: 'video',   label: 'Video',   icon: '🎬' },
  { type: 'quote',   label: 'Quote',   icon: '❝' },
  { type: 'divider', label: 'Divider', icon: '─' },
]

function newBlock(type: ContentBlock['type']): ContentBlock {
  const id = `cb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  switch (type) {
    case 'text':    return { id, type, html: '' } as ContentTextBlock
    case 'image':   return { id, type, filename: '' } as ContentImageBlock
    case 'video':   return { id, type } as ContentVideoBlock
    case 'quote':   return { id, type, quote: '' } as ContentQuoteBlock
    case 'divider': return { id, type, style: 'line' } as ContentDividerBlock
  }
}

// ---------------------------------------------------------------------------
// Individual block editors
// ---------------------------------------------------------------------------

function TextBlockEditor({ block, onChange, onInsertImage }: { block: ContentTextBlock; onChange: (b: Partial<ContentTextBlock>) => void; onInsertImage?: () => Promise<string | null> }) {
  return (
    <RichTextEditor
      key={block.id}
      content={block.html}
      onChange={html => onChange({ html })}
      minHeight={120}
      placeholder="Write something…"
      onInsertImage={onInsertImage}
    />
  )
}

function ImageBlockEditor({ block, onChange, portfolioDir }: { block: ContentImageBlock; onChange: (b: Partial<ContentImageBlock>) => void; portfolioDir: string }) {
  async function handleImport(paths: string[]) {
    const filenames = await window.api.importMedia(portfolioDir, paths)
    if (filenames[0]) onChange({ filename: filenames[0] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {block.filename ? (
        <div style={{ position: 'relative' }}>
          <img
            src={toFileUrl(`${portfolioDir}/assets/${block.filename}`)}
            style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            alt={block.alt ?? block.caption ?? block.filename}
          />
          <button
            onClick={() => onChange({ filename: '' })}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      ) : (
        <MediaDropzone
          label="Click to add image"
          filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'] }]}
          multiple={false}
          onFiles={handleImport}
        />
      )}
      <input value={block.caption ?? ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Caption (optional)" style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12 }} />
      <input value={block.alt ?? ''} onChange={e => onChange({ alt: e.target.value })} placeholder="Alt text for screen readers (optional)" style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, color: '#666' }} />
    </div>
  )
}

function VideoBlockEditor({ block, onChange, portfolioDir }: { block: ContentVideoBlock; onChange: (b: Partial<ContentVideoBlock>) => void; portfolioDir: string }) {
  const [urlInput, setUrlInput] = useState(block.embedUrl ?? '')
  const [showUrl, setShowUrl] = useState(!!block.embedUrl)

  async function handleFileImport(paths: string[]) {
    const filenames = await window.api.importMedia(portfolioDir, paths)
    if (filenames[0]) onChange({ filename: filenames[0], embedUrl: undefined })
  }

  function applyUrl() {
    const embedUrl = parseVideoUrl(urlInput)
    if (embedUrl) onChange({ embedUrl, filename: undefined })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {block.embedUrl ? (
        <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
          <iframe src={block.embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Video" />
          <button onClick={() => onChange({ embedUrl: undefined })} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      ) : block.filename ? (
        <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
          <video src={toFileUrl(`${portfolioDir}/assets/${block.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          <button onClick={() => onChange({ filename: undefined })} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      ) : (
        <>
          {showUrl ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyUrl()} placeholder="https://youtube.com/watch?v=…" style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              <button onClick={applyUrl} style={{ padding: '8px 14px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Add</button>
              <button onClick={() => setShowUrl(false)} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'white' }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <MediaDropzone label="Click to add video file (MP4, WebM)" filters={[{ name: 'Videos', extensions: ['mp4', 'webm'] }]} onFiles={handleFileImport} />
              </div>
              <button onClick={() => setShowUrl(true)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'white', whiteSpace: 'nowrap' }}>🔗 URL</button>
            </div>
          )}
        </>
      )}
      <input value={block.caption ?? ''} onChange={e => onChange({ caption: e.target.value })} placeholder="Title (optional)" style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12 }} />
    </div>
  )
}

function QuoteBlockEditor({ block, onChange }: { block: ContentQuoteBlock; onChange: (b: Partial<ContentQuoteBlock>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea value={block.quote} onChange={e => onChange({ quote: e.target.value })} placeholder="Enter quote text…" rows={3} style={{ padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14, fontStyle: 'italic', resize: 'vertical', boxSizing: 'border-box', width: '100%' }} />
      <input value={block.attribution ?? ''} onChange={e => onChange({ attribution: e.target.value })} placeholder="Attribution (optional)" style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12 }} />
    </div>
  )
}

function DividerBlockEditor({ block, onChange }: { block: ContentDividerBlock; onChange: (b: Partial<ContentDividerBlock>) => void }) {
  const styles: ContentDividerBlock['style'][] = ['line', 'dots', 'stars', 'thick']
  const previews: Record<string, string> = { line: '─────', dots: '· · ·', stars: '★  ★  ★', thick: '▬▬▬' }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {styles.map(s => (
        <button key={s} onClick={() => onChange({ style: s })}
          style={{ flex: 1, padding: '8px 4px', border: `1px solid ${block.style === s ? '#6366f1' : '#ddd'}`, borderRadius: 6, background: block.style === s ? '#f0f0ff' : 'white', cursor: 'pointer', fontSize: 13, color: block.style === s ? '#6366f1' : '#555' }}>
          {previews[s!]}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable block wrapper
// ---------------------------------------------------------------------------

const BLOCK_LABELS: Record<ContentBlock['type'], string> = {
  text: '📝 Text', image: '🖼 Image', video: '🎬 Video', quote: '❝ Quote', divider: '─ Divider',
}

function BlockCard({ block, onUpdate, onRemove, portfolioDir, onInsertImage }: {
  block: ContentBlock
  onUpdate: (patch: Partial<ContentBlock>) => void
  onRemove: () => void
  portfolioDir: string
  onInsertImage?: () => Promise<string | null>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8f8f8', borderBottom: collapsed ? 'none' : '1px solid #e0e0e0' }}>
        <div {...attributes} {...listeners} style={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#bbb', fontSize: 16, flexShrink: 0 }}>⠿</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#555', flex: 1 }}>{BLOCK_LABELS[block.type]}</span>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 14 }}>{collapsed ? '▶' : '▼'}</button>
        <button onPointerDown={e => e.stopPropagation()} onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
          aria-label="Remove block">×</button>
      </div>

      {/* Block editor */}
      {!collapsed && (
        <div style={{ padding: 14 }}>
          {block.type === 'text'    && <TextBlockEditor    block={block} onChange={p => onUpdate(p)} onInsertImage={onInsertImage} />}
          {block.type === 'image'   && <ImageBlockEditor   block={block} onChange={p => onUpdate(p)} portfolioDir={portfolioDir} />}
          {block.type === 'video'   && <VideoBlockEditor   block={block} onChange={p => onUpdate(p)} portfolioDir={portfolioDir} />}
          {block.type === 'quote'   && <QuoteBlockEditor   block={block} onChange={p => onUpdate(p)} />}
          {block.type === 'divider' && <DividerBlockEditor block={block} onChange={p => onUpdate(p)} />}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main section component
// ---------------------------------------------------------------------------

export function ContentSection({ section }: { section: ContentSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [showPicker, setShowPicker] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function updateSection(patch: Partial<ContentSectionType>) {
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
    const oldIndex = section.blocks.findIndex(b => b.id === active.id)
    const newIndex  = section.blocks.findIndex(b => b.id === over.id)
    updateSection({ blocks: arrayMove(section.blocks, oldIndex, newIndex) })
  }

  function addBlock(type: ContentBlock['type']) {
    updateSection({ blocks: [...section.blocks, newBlock(type)] })
    setShowPicker(false)
  }

  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    updateSection({ blocks: section.blocks.map(b => b.id === id ? { ...b, ...patch } as ContentBlock : b) })
  }

  function removeBlock(id: string) {
    updateSection({ blocks: section.blocks.filter(b => b.id !== id) })
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={section.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {section.blocks.length === 0 && (
              <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                No blocks yet — add one below to get started.
              </p>
            )}
            {section.blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                onUpdate={patch => updateBlock(block.id, patch)}
                onRemove={() => removeBlock(block.id)}
                portfolioDir={state.portfolioDir!}
                onInsertImage={onInsertImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Block type picker */}
      {showPicker ? (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, background: '#f8f8f8' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontWeight: 600 }}>Choose block type</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => addBlock(bt.type)}
                style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#333' }}
              >
                {bt.icon} {bt.label}
              </button>
            ))}
            <button onClick={() => setShowPicker(false)} style={{ marginLeft: 'auto', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#aaa' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowPicker(true)}
          style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
        >
          + Add block
        </button>
      )}
    </div>
  )
}
