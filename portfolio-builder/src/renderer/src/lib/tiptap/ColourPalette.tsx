/**
 * ColourPalette — a custom TipTap inline node that renders a row of coloured
 * circles. Useful for showing colour palettes inside project descriptions,
 * gallery captions, etc.
 *
 * In the editor: an interactive React NodeView — click a swatch to edit its
 * colour, click × to remove, click + to add.
 *
 * In the generated HTML: <span class="colour-palette"> containing
 * <span class="palette-swatch" style="background:#hex"> elements.
 * The sanitiser allows background in inline styles, so this round-trips
 * through export without stripping.
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState, useRef } from 'react'

// ---------------------------------------------------------------------------
// React NodeView rendered inside the editor
// ---------------------------------------------------------------------------

function PaletteView({ node, updateAttributes, selected }: NodeViewProps) {
  const colours = JSON.parse(node.attrs.colours as string) as string[]
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function setColours(next: string[]) {
    updateAttributes({ colours: JSON.stringify(next) })
  }

  function updateColour(i: number, colour: string) {
    const next = [...colours]; next[i] = colour; setColours(next)
  }

  function removeColour(i: number) {
    setColours(colours.filter((_, idx) => idx !== i))
  }

  function addColour() {
    setColours([...colours, '#6366f1'])
    // Focus the new input after state update
    setTimeout(() => inputRefs.current[colours.length]?.click(), 0)
  }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle', userSelect: 'none', padding: '4px 10px', background: selected ? '#e0e7ff' : '#f8f8f8', borderRadius: 20, border: `1px solid ${selected ? '#a5b4fc' : '#e0e0e0'}`, cursor: 'default' }}>
      {colours.map((colour, i) => (
        <span
          key={i}
          style={{ position: 'relative', display: 'inline-flex' }}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <label style={{ cursor: 'pointer' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: colour, display: 'block', border: '2px solid rgba(0,0,0,0.12)', boxShadow: hoveredIndex === i ? '0 0 0 2px #6366f1' : 'none', transition: 'box-shadow 0.1s' }} />
            <input
              ref={el => { inputRefs.current[i] = el }}
              type="color"
              value={colour}
              onChange={e => updateColour(i, e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
          </label>
          {hoveredIndex === i && (
            <button
              contentEditable={false}
              onMouseDown={e => { e.preventDefault(); removeColour(i) }}
              style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#e94560', color: 'white', border: 'none', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 1 }}
            >×</button>
          )}
        </span>
      ))}
      <button
        contentEditable={false}
        onMouseDown={e => { e.preventDefault(); addColour() }}
        style={{ width: 26, height: 26, borderRadius: '50%', background: 'white', border: '2px dashed #ccc', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 16, lineHeight: 1 }}
        title="Add colour"
      >+</button>
    </NodeViewWrapper>
  )
}

// ---------------------------------------------------------------------------
// TipTap Node extension
// ---------------------------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colourPalette: {
      insertColourPalette: (colours?: string[]) => ReturnType
    }
  }
}

export const ColourPalette = Node.create({
  name: 'colourPalette',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      colours: {
        default: JSON.stringify(['#6366f1', '#f59e0b', '#10b981']),
        parseHTML: el => el.getAttribute('data-colours') ?? JSON.stringify([]),
        renderHTML: attrs => ({ 'data-colours': attrs.colours }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-colours]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const colours = JSON.parse(node.attrs.colours as string) as string[]
    const swatches = colours.map(c =>
      ['span', { class: 'palette-swatch', style: `background:${c}` }] as [string, Record<string, string>]
    )
    return ['span', mergeAttributes(HTMLAttributes, { class: 'colour-palette', contenteditable: 'false' }), ...swatches]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PaletteView)
  },

  addCommands() {
    return {
      insertColourPalette: (colours = ['#6366f1', '#f59e0b', '#10b981']) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { colours: JSON.stringify(colours) } }),
    }
  },
})
