import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { usePortfolio } from '../../store/PortfolioContext'
import type { ProjectSection as ProjectSectionType, MediaItem } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { toFileUrl } from '../../utils/fileUrl'

export function ProjectSection({ section }: { section: ProjectSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  // Refs to avoid stale closures in TipTap's onUpdate
  const sectionIdRef = useRef(section.id)
  const stateRef = useRef(state)
  const updatePortfolioRef = useRef(updatePortfolio)
  useEffect(() => { sectionIdRef.current = section.id }, [section.id])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { updatePortfolioRef.current = updatePortfolio }, [updatePortfolio])

  const editor = useEditor({
    extensions: [StarterKit],
    content: section.description,
    onUpdate: ({ editor: e }) => {
      const description = e.getHTML()
      const s = stateRef.current
      updatePortfolioRef.current({
        ...s.portfolio!,
        sections: s.portfolio!.sections.map(sec =>
          sec.id === sectionIdRef.current ? { ...sec, description } as typeof sec : sec
        ),
      })
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== section.description) {
      editor.commands.setContent(section.description, false)
    }
  }, [section.id])

  function updateSection(patch: Partial<ProjectSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as typeof s : s
      ),
    })
  }

  async function handleCoverImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    if (filenames[0]) updateSection({ coverImageFilename: filenames[0] })
  }

  async function handleImagesImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    const newItems: MediaItem[] = filenames.map(filename => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
    }))
    updateSection({ items: [...section.items, ...newItems] })
  }

  function removeImage(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

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
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>

      {/* Cover image */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Cover image</span>
        {section.coverImageFilename ? (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img
              src={toFileUrl(`${state.portfolioDir}/assets/${section.coverImageFilename}`)}
              style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              alt="Cover"
            />
            <button
              onClick={() => updateSection({ coverImageFilename: undefined })}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
              aria-label="Remove cover image"
            >
              ×
            </button>
          </div>
        ) : (
          <MediaDropzone
            label="Click to add a cover image"
            filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif', 'tif', 'tiff'] }]}
            multiple={false}
            onFiles={handleCoverImport}
          />
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
            {btn('B',       () => editor?.chain().focus().toggleBold().run() ?? false)}
            {btn('I',       () => editor?.chain().focus().toggleItalic().run() ?? false)}
            {btn('H2',      () => editor?.chain().focus().toggleHeading({ level: 2 }).run() ?? false)}
            {btn('H3',      () => editor?.chain().focus().toggleHeading({ level: 3 }).run() ?? false)}
            {btn('• List',  () => editor?.chain().focus().toggleBulletList().run() ?? false)}
            {btn('1. List', () => editor?.chain().focus().toggleOrderedList().run() ?? false)}
          </div>
          <EditorContent editor={editor} style={{ padding: 16, minHeight: 160, fontSize: 14 }} />
        </div>
      </div>

      {/* Project images */}
      <div>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Project images</span>
        {section.items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
            {section.items.map(item => (
              <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f0f0f0', aspectRatio: '1' }}>
                <img
                  src={toFileUrl(`${state.portfolioDir}/assets/${item.filename}`)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  alt={item.caption ?? item.filename}
                />
                <button
                  onClick={() => removeImage(item.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={`Remove ${item.filename}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <MediaDropzone
          label="Click to add project images"
          filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'tif', 'tiff'] }]}
          onFiles={handleImagesImport}
        />
      </div>
    </div>
  )
}
