/**
 * RichTextEditor — shared rich-text editing component built on TipTap.
 *
 * Features:
 *   - Inline formatting: Bold, Italic, Underline, Strikethrough, Inline code
 *   - Superscript and Subscript
 *   - Text colour (12 swatches + custom hex input)
 *   - Text highlight / background colour
 *   - Block style dropdown: Paragraph / H1–H4
 *   - Text alignment: Left, Centre, Right
 *   - Lists: Bullet and Numbered
 *   - Blockquote, Horizontal rule, Code block
 *   - Links (inline URL bar — no window.prompt, which is blocked in Electron)
 *   - Image insertion (optional — only shown when onInsertImage prop is provided)
 *   - Table (insert + contextual row/column controls)
 *   - Clear formatting
 *   - Undo / Redo
 *
 * Key patterns:
 *   - onChangeRef: keeps onChange current inside TipTap's onUpdate closure
 *     without recreating the editor on every parent render.
 *   - Colour swatches use onMouseDown + preventDefault so the editor never
 *     loses focus/selection before the colour is applied.
 *   - key={section.id} on the call site remounts the component on section
 *     switch, giving a clean editor state.
 */

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { StyledDivider, type DividerStyle } from '../../lib/tiptap/StyledDivider'
import { ColourPalette } from '../../lib/tiptap/ColourPalette'

// ---------------------------------------------------------------------------
// Global styles — injected once, shared across all RichTextEditor instances
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
    .tiptap code { background: #f1f1f1; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; font-family: monospace; }
    .tiptap mark { background: #fef08a; border-radius: 2px; padding: 0 2px; }
    .tiptap sup { font-size: 0.75em; vertical-align: super; }
    .tiptap sub { font-size: 0.75em; vertical-align: sub; }
    .tiptap pre { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
    .tiptap pre code { background: none; padding: 0; }
    .tiptap img { max-width: 100%; border-radius: 6px; display: block; margin: 8px 0; }
    .tiptap table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .tiptap td, .tiptap th { border: 1px solid #ddd; padding: 8px 12px; min-width: 60px; vertical-align: top; }
    .tiptap th { background: #f8f8f8; font-weight: 600; }
    .tiptap .selectedCell { background: #e0e7ff !important; }
    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left; color: #bbb; pointer-events: none; height: 0;
    }
    .tiptap .colour-palette { display: inline-flex; align-items: center; gap: 5px; vertical-align: middle; }
    .tiptap .palette-swatch { width: 22px; height: 22px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.12); }
  `
  document.head.appendChild(s)
}

// ---------------------------------------------------------------------------
// Colour palette for the text colour picker
// ---------------------------------------------------------------------------

const COLOURS = [
  '#000000', '#555555', '#888888', '#bbbbbb',
  '#e94560', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  content: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
  /** If provided, an image insert button is shown in the toolbar. */
  onInsertImage?: () => Promise<string | null>
}

// ---------------------------------------------------------------------------
// Internal toolbar helpers
// ---------------------------------------------------------------------------

const SEP = () => <div style={{ width: 1, height: 20, background: '#e0e0e0', margin: '0 2px' }} />

/**
 * Toolbar button. onMouseDown + preventDefault keeps editor focus/selection
 * intact before the formatting command runs.
 */
function Btn({
  title, active, onClick, children, style: extraStyle,
}: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
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
        position: 'relative',
        ...extraStyle,
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RichTextEditor({
  content, onChange, minHeight = 160, placeholder = 'Start typing…', onInsertImage,
}: Props) {
  useEffect(ensureEditorStyles, [])

  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [showColours, setShowColours] = useState(false)
  const [showTableMenu, setShowTableMenu] = useState(false)
  const [showDividerMenu, setShowDividerMenu] = useState(false)
  const [hexInput, setHexInput] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }), // replaced by StyledDivider
      StyledDivider,
      ColourPalette,
      Underline,
      TextStyle,  // required peer for Color
      Color,
      Highlight.configure({ multicolor: false }),
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content) editor.commands.setContent(content, false)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (linkUrl !== null) linkInputRef.current?.focus()
  }, [linkUrl !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close menus when clicking outside
  useEffect(() => {
    function handleClick() { setShowColours(false); setShowTableMenu(false); setShowDividerMenu(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!editor) return null

  const headingLevel = ([1, 2, 3, 4] as const).find(l => editor.isActive('heading', { level: l }))
  const headingValue = headingLevel ? String(headingLevel) : '0'
  const currentColour = editor.getAttributes('textStyle').color ?? '#000000'
  const inTable = editor.isActive('table')

  function openLinkInput() {
    const href = editor?.getAttributes('link').href ?? ''
    setLinkUrl(href)
  }

  function applyLink() {
    if (!linkUrl?.trim()) {
      editor?.chain().focus().unsetLink().run()
    } else {
      const href = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`
      editor?.chain().focus().setLink({ href }).run()
    }
    setLinkUrl(null)
  }

  async function handleInsertImage() {
    if (!onInsertImage) return
    const url = await onInsertImage()
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  function handleInsertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    setShowTableMenu(false)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>

      {/* ── Main toolbar ── */}
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
        <Btn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <code style={{ fontSize: 11 }}>`</code>
        </Btn>
        <Btn title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          x<sup style={{ fontSize: 8 }}>2</sup>
        </Btn>
        <Btn title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          x<sub style={{ fontSize: 8 }}>2</sub>
        </Btn>

        {/* Text colour — swatch popup */}
        <div style={{ position: 'relative' }}>
          <Btn
            title="Text colour"
            active={showColours}
            onClick={() => setShowColours(v => !v)}
          >
            <span style={{ fontWeight: 700, color: currentColour === '#000000' ? '#333' : currentColour }}>A</span>
            <span style={{ display: 'block', width: 14, height: 3, background: currentColour, borderRadius: 1, position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)' }} />
          </Btn>
          {showColours && (
            <div
              style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: 6, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: 116 }}
              onMouseDown={e => e.preventDefault()}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 20px)', gap: 4, marginBottom: 6 }}>
                {COLOURS.map(c => (
                  <div
                    key={c}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColours(false) }}
                    style={{ width: 20, height: 20, borderRadius: 3, background: c, cursor: 'pointer', border: currentColour === c ? '2px solid #4f46e5' : '1px solid #ddd' }}
                    title={c}
                  />
                ))}
                {/* Remove colour */}
                <div
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColours(false) }}
                  style={{ width: 20, height: 20, borderRadius: 3, background: 'white', cursor: 'pointer', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#aaa' }}
                  title="Remove colour"
                >✕</div>
              </div>
              {/* Custom hex input */}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={hexInput}
                  onChange={e => setHexInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
                      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                        editor.chain().focus().setColor(hex).run()
                        setShowColours(false)
                        setHexInput('')
                      }
                    }
                  }}
                  placeholder="#hex"
                  maxLength={7}
                  style={{ flex: 1, fontSize: 11, padding: '3px 5px', border: '1px solid #ddd', borderRadius: 3, minWidth: 0 }}
                />
                <div
                  onMouseDown={e => {
                    e.preventDefault()
                    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                      editor.chain().focus().setColor(hex).run()
                      setShowColours(false)
                      setHexInput('')
                    }
                  }}
                  style={{ width: 24, height: 24, borderRadius: 3, background: /^#[0-9a-fA-F]{6}$/.test(hexInput.startsWith('#') ? hexInput : `#${hexInput}`) ? (hexInput.startsWith('#') ? hexInput : `#${hexInput}`) : '#eee', border: '1px solid #ddd', cursor: 'pointer', flexShrink: 0 }}
                  title="Apply custom colour"
                />
              </div>
            </div>
          )}
        </div>

        {/* Highlight / background colour */}
        <Btn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <span style={{ background: '#fef08a', padding: '0 3px', borderRadius: 2, fontSize: 11, lineHeight: 1.4 }}>H</span>
        </Btn>

        <SEP />

        {/* Block style */}
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
        <Btn title="Blockquote"  active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>"</Btn>

        {/* Styled divider dropdown */}
        <div style={{ position: 'relative' }}>
          <Btn title="Insert divider" active={showDividerMenu} onClick={() => setShowDividerMenu(v => !v)}>─▾</Btn>
          {showDividerMenu && (
            <div
              style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: 4, marginTop: 2, minWidth: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 1 }}
              onMouseDown={e => e.preventDefault()}
            >
              {([
                ['line',  '─────  Line'],
                ['dots',  '· · ·  Dots'],
                ['stars', '★ ★ ★  Stars'],
                ['thick', '▬▬▬  Thick'],
              ] as [DividerStyle, string][]).map(([style, label]) => (
                <TableMenuItem key={style} label={label} onClick={() => { editor.chain().focus().insertDivider(style).run(); setShowDividerMenu(false) }} />
              ))}
            </div>
          )}
        </div>

        <Btn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>&lt;/&gt;</Btn>
        <Btn title="Link"       active={editor.isActive('link')}      onClick={openLinkInput}>🔗</Btn>

        {/* Colour palette insert */}
        <Btn title="Insert colour palette" active={false} onClick={() => editor.chain().focus().insertColourPalette().run()}>🎨+</Btn>

        {/* Image insert — only shown when parent provides the callback */}
        {onInsertImage && (
          <Btn title="Insert image" active={false} onClick={handleInsertImage}>🖼</Btn>
        )}

        {/* Table */}
        <div style={{ position: 'relative' }}>
          <Btn title={inTable ? 'Table options' : 'Insert table'} active={inTable || showTableMenu} onClick={() => setShowTableMenu(v => !v)}>
            ⊞
          </Btn>
          {showTableMenu && (
            <div
              style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: 4, marginTop: 2, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 1 }}
              onMouseDown={e => e.preventDefault()}
            >
              {!inTable ? (
                <TableMenuItem label="Insert 3×3 table" onClick={handleInsertTable} />
              ) : (<>
                <TableMenuItem label="Add row above"    onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false) }} />
                <TableMenuItem label="Add row below"    onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false) }} />
                <TableMenuItem label="Delete row"       onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false) }} danger />
                <div style={{ height: 1, background: '#f0f0f0', margin: '2px 0' }} />
                <TableMenuItem label="Add column left"  onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false) }} />
                <TableMenuItem label="Add column right" onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false) }} />
                <TableMenuItem label="Delete column"    onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false) }} danger />
                <div style={{ height: 1, background: '#f0f0f0', margin: '2px 0' }} />
                <TableMenuItem label="Delete table"     onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false) }} danger />
              </>)}
            </div>
          )}
        </div>

        <SEP />

        {/* Clear formatting */}
        <Btn title="Clear formatting" active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>⊘</Btn>

        <SEP />

        {/* History */}
        <Btn title="Undo (Ctrl+Z)" active={false} onClick={() => editor.chain().focus().undo().run()}>↩</Btn>
        <Btn title="Redo (Ctrl+Y)" active={false} onClick={() => editor.chain().focus().redo().run()}>↪</Btn>
      </div>

      {/* ── Link input bar ── */}
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

      {/* ── Editor content ── */}
      <EditorContent editor={editor} style={{ padding: '12px 16px', minHeight, fontSize: 14, lineHeight: 1.6 }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table dropdown menu item
// ---------------------------------------------------------------------------

function TableMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={e => { e.preventDefault(); onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4,
        color: danger ? '#e94560' : '#333',
        background: hovered ? (danger ? '#fff5f6' : '#f5f5f5') : 'transparent',
      }}
    >
      {label}
    </div>
  )
}
