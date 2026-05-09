import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { usePortfolio } from '../../store/PortfolioContext'
import type { CustomSection as CustomSectionType, Section } from '../../types/portfolio'

export function CustomSection({ section }: { section: CustomSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  // Refs to avoid stale closures in TipTap's onUpdate callback
  const sectionIdRef = useRef(section.id)
  const stateRef = useRef(state)
  const updatePortfolioRef = useRef(updatePortfolio)

  useEffect(() => { sectionIdRef.current = section.id }, [section.id])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { updatePortfolioRef.current = updatePortfolio }, [updatePortfolio])

  const editor = useEditor({
    extensions: [StarterKit],
    content: section.html,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      const currentState = stateRef.current
      const currentSectionId = sectionIdRef.current
      updatePortfolioRef.current({
        ...currentState.portfolio!,
        sections: currentState.portfolio!.sections.map(s =>
          s.id === currentSectionId ? { ...s, html } as Section : s
        ),
      })
    },
  })

  // Re-initialise content when switching to a different custom section
  useEffect(() => {
    if (editor && editor.getHTML() !== section.html) {
      editor.commands.setContent(section.html, false)
    }
  }, [section.id])

  const btn = (label: string, action: () => boolean) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); action() }}
      style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: 'white' }}
    >
      {label}
    </button>
  )

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
          {btn('B',       () => editor?.chain().focus().toggleBold().run() ?? false)}
          {btn('I',       () => editor?.chain().focus().toggleItalic().run() ?? false)}
          {btn('H2',      () => editor?.chain().focus().toggleHeading({ level: 2 }).run() ?? false)}
          {btn('H3',      () => editor?.chain().focus().toggleHeading({ level: 3 }).run() ?? false)}
          {btn('• List',  () => editor?.chain().focus().toggleBulletList().run() ?? false)}
          {btn('1. List', () => editor?.chain().focus().toggleOrderedList().run() ?? false)}
        </div>
        <EditorContent editor={editor} style={{ padding: 16, minHeight: 200, fontSize: 14 }} />
      </div>
    </div>
  )
}
