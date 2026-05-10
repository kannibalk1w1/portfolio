/**
 * StyledDivider — replaces TipTap's plain HorizontalRule with a node that
 * supports four visual styles: line, dots, stars, thick.
 *
 * Each style is serialised as <hr class="divider-{style}"> so it round-trips
 * cleanly through the sanitiser and generates styled CSS in the published site.
 *
 * Use via editor.commands.insertDivider(style).
 */
import { Node, mergeAttributes } from '@tiptap/core'

export type DividerStyle = 'line' | 'dots' | 'stars' | 'thick'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledDivider: {
      insertDivider: (style: DividerStyle) => ReturnType
    }
  }
}

export const StyledDivider = Node.create({
  name: 'styledDivider',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      dividerStyle: { default: 'line' as DividerStyle },
    }
  },

  parseHTML() {
    return [
      { tag: 'hr.divider-line',  attrs: { dividerStyle: 'line' } },
      { tag: 'hr.divider-dots',  attrs: { dividerStyle: 'dots' } },
      { tag: 'hr.divider-stars', attrs: { dividerStyle: 'stars' } },
      { tag: 'hr.divider-thick', attrs: { dividerStyle: 'thick' } },
      { tag: 'hr',               attrs: { dividerStyle: 'line' } }, // plain <hr> fallback
    ]
  },

  renderHTML({ node }) {
    return ['hr', mergeAttributes({ class: `divider-${node.attrs.dividerStyle}` })]
  },

  // Minimal DOM node view — shows the divider visually in the editor
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.setAttribute('contenteditable', 'false')
      dom.className = `tiptap-divider divider-${node.attrs.dividerStyle}`
      dom.style.cssText = 'margin:12px 0;text-align:center;userSelect:none;'
      switch (node.attrs.dividerStyle as DividerStyle) {
        case 'dots':  dom.innerHTML = '<span style="color:#94a3b8;font-size:18px;letter-spacing:6px">· · ·</span>'; break
        case 'stars': dom.innerHTML = '<span style="color:#94a3b8;font-size:16px;letter-spacing:6px">★  ★  ★</span>'; break
        case 'thick': dom.innerHTML = '<hr style="border:none;border-top:4px solid #e2e8f0;margin:0">'; break
        default:      dom.innerHTML = '<hr style="border:none;border-top:2px solid #e2e8f0;margin:0">'; break
      }
      return { dom }
    }
  },

  addCommands() {
    return {
      insertDivider: (style: DividerStyle) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { dividerStyle: style } }),
    }
  },
})
