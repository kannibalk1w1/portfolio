/**
 * Callout — a Notion-style info/tip/warning/note block.
 *
 * Wraps block-level content in a coloured aside with an icon. Unlike the
 * atom nodes (Palette, Divider), this node has content: 'block+' so the
 * text inside is fully editable without a custom NodeView.
 *
 * Serialised as: <div class="callout callout-{type}" data-callout="{type}">
 * The sanitiser allows div.callout-* classes so it round-trips through export.
 *
 * Insert via: editor.commands.insertCallout(type)
 * Toggle/change type: editor.commands.setCalloutType(type)
 */
import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutType = 'info' | 'tip' | 'warning' | 'note'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (calloutType?: CalloutType) => ReturnType
      setCalloutType: (calloutType: CalloutType) => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      calloutType: { default: 'info' as CalloutType },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-callout="info"]',    attrs: { calloutType: 'info' } },
      { tag: 'div[data-callout="tip"]',     attrs: { calloutType: 'tip' } },
      { tag: 'div[data-callout="warning"]', attrs: { calloutType: 'warning' } },
      { tag: 'div[data-callout="note"]',    attrs: { calloutType: 'note' } },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.calloutType as CalloutType
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-callout': type,
      class: `callout callout-${type}`,
    }), 0]
  },

  addCommands() {
    return {
      insertCallout: (calloutType: CalloutType = 'info') =>
        ({ commands }) => commands.wrapIn(this.name, { calloutType }),

      setCalloutType: (calloutType: CalloutType) =>
        ({ commands }) => commands.updateAttributes(this.name, { calloutType }),
    }
  },
})
