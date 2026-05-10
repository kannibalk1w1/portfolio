/**
 * RichTextEditor — shared rich-text editing component built on TipTap.
 *
 * Used by every section that needs formatted content: bio, custom text blocks,
 * project descriptions, and the optional description field on structured sections
 * (Gallery, Videos, Models, Games, Code).
 *
 * Key patterns used here:
 *  - onChangeRef: keeps the onChange prop current inside the editor's onUpdate
 *    callback without triggering a full editor re-initialisation on every render.
 *  - key={section.id} on the parent call site causes React to remount the
 *    component when the user switches to a different section, giving us a clean
 *    editor state with no stale content.
 *  - ensureEditorStyles: injects global CSS once at first mount so that TipTap's
 *    generated HTML renders with sensible defaults and placeholder text works.
 */

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

// ---------------------------------------------------------------------------
// Global editor styles — injected once, shared across all RichTextEditor instances
// ---------------------------------------------------------------------------

function ensureEditorStyles() {
  const id = 'rte-global-styles'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    .tiptap { outline: none; }
    .tiptap > * + * { margin-top: 0.6em; }
    .tiptap h1 { font-size: 1.6em; font-weight: 700; }
    .tiptap h2 { font-size: 1.35em; font-weight: 700; }
    .tiptap h3 { font-size: 1.15em; font-weight: 600; }
    .tiptap h4 { font-size: 1em; font-weight: 600; }
    .tiptap ul, .tiptap ol { padding-left: 1.4em; }
    .tiptap blockquote { border-left: 3px solid #ddd; padding-left: 12px; color: #666; }
    .tiptap hr { border: none; border-top: 2px solid #e0e0e0; margin: 12px 0; }
    .tiptap a { color: #4f46e5; text-decoration: underline; }
    .tiptap code { background: #f1f1f1; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
    .tiptap pre { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
    .tiptap pre code { background: none; padding: 0; }
    /* Placeholder text — shown when the editor is empty */
    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left; color: #bbb; pointer-events: none; height: 0;
    }
  `
  document.head.appendChild(s)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  content: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}

// ---------------------------------------------------------------------------
// Internal toolbar helpers
// ---------------------------------------------------------------------------

/** Thin vertical rule used as a visual separator between toolbar groups */
const SEP = () => <div style={{ width: 1, height: 20, background: '#e0e0e0', margin: '0 2px' }} />

/**
 * Toolbar button. Uses onMouseDown + e.preventDefault() rather than onClick so
 * the editor does not lose focus (and therefore selection) before the command runs.
 */
function Btn({
  title, active, onClick, children,
}: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 28, height: 28, padding: '0 5px',
        border: '1px solid', borderColor: active ? '#a5b4fc' : '#ddd',
        borderRadius: 4, cursor: 'pointer',
        background: active ? '#e0e7ff' : 'white',
        color: '#333', fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RichTextEditor({ content, onChange, minHeight = 160, placeholder = 'Start typing…' }: Props) {
  useEffect(ensureEditorStyles, [])

  // Keep the onChange prop current inside the onUpdate closure without
  // recreating the editor on every parent render.
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // null = hidden; string = current URL value being edited
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      // TextAlign needs to know which node types it can act on
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      // openOnClick: false so clicking links in the editor selects them rather
      // than navigating away while the user is still editing
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getHTML()),
  })

  // Sync content when the parent changes it externally (e.g. after section switch
  // triggered via the key prop causing remount — this guard is a safety net).
  useEffect(() => {
    if (editor && editor.getHTML() !== content) editor.commands.setContent(content, false)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus the URL input whenever the link bar appears
  useEffect(() => {
    if (linkUrl !== null) linkInputRef.current?.focus()
  }, [linkUrl !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // Editor initialises asynchronously; return nothing until it is ready
  if (!editor) return null

  // Determine current heading level for the dropdown
  const headingLevel = ([1, 2, 3, 4] as const).find(l => editor.isActive('heading', { level: l }))
  const headingValue = headingLevel ? String(headingLevel) : '0'

  function openLinkInput() {
    // Pre-fill with existing href if cursor is already on a link
    const href = editor?.getAttributes('link').href ?? ''
    setLinkUrl(href)
  }

  function applyLink() {
    if (!linkUrl?.trim()) {
      // Empty URL → remove the link
      editor?.chain().focus().unsetLink().run()
    } else {
      // Prefix with https:// if the user typed a bare domain
      const href = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`
      editor?.chain().focus().setLink({ href }).run()
    }
    setLinkUrl(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, padding: '6px 10px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>

        {/* Inline formatting */}
        <Btn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </Btn>
        <Btn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </Btn>

        <SEP />

        {/* Block style — implemented as a <select> so all heading levels fit compactly */}
        <select
          value={headingValue}
          onChange={e => {
            const level = parseInt(e.target.value)
            if (level === 0) editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run()
          }}
          style={{ height: 28, padding: '0 6px', border: '1px solid #ddd', borderRadius: 4, background: 'white', fontSize: 12, cursor: 'pointer' }}
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <SEP />

        {/* Alignment */}
        <Btn title="Align left"   active={editor.isActive({ textAlign: 'left' })}   onClick={() => editor.chain().focus().setTextAlign('left').run()}>≡·</Btn>
        <Btn title="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>·≡·</Btn>
        <Btn title="Align right"  active={editor.isActive({ textAlign: 'right' })}  onClick={() => editor.chain().focus().setTextAlign('right').run()}>·≡</Btn>

        <SEP />

        {/* Lists */}
        <Btn title="Bullet list"   active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1≡</Btn>

        <SEP />

        {/* Block elements */}
        <Btn title="Blockquote"      active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>"</Btn>
        <Btn title="Horizontal rule" active={false}                         onClick={() => editor.chain().focus().setHorizontalRule().run()}>─</Btn>
        <Btn title="Link"            active={editor.isActive('link')}       onClick={openLinkInput}>🔗</Btn>

        <SEP />

        {/* History */}
        <Btn title="Undo (Ctrl+Z)" active={false} onClick={() => editor.chain().focus().undo().run()}>↩</Btn>
        <Btn title="Redo (Ctrl+Y)" active={false} onClick={() => editor.chain().focus().redo().run()}>↪</Btn>
      </div>

      {/* ── Link input bar (shown when 🔗 is clicked) ── */}
      {linkUrl !== null && (
        <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: '#f0f4ff', borderBottom: '1px solid #c7d2fe', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>URL:</span>
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkUrl(null) }}
            placeholder="https://example.com"
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #c7d2fe', borderRadius: 4, fontSize: 12 }}
          />
          <button onMouseDown={e => { e.preventDefault(); applyLink() }} style={{ padding: '3px 10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Set</button>
          {editor.isActive('link') && (
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setLinkUrl(null) }} style={{ padding: '3px 10px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: 'white' }}>Remove</button>
          )}
          <button onMouseDown={e => { e.preventDefault(); setLinkUrl(null) }} style={{ padding: '3px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#999' }}>✕</button>
        </div>
      )}

      {/* ── Editor content area ── */}
      <EditorContent editor={editor} style={{ padding: '12px 16px', minHeight, fontSize: 14, lineHeight: 1.6 }} />
    </div>
  )
}
