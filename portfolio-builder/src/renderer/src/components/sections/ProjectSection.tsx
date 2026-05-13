import { usePortfolio } from '../../store/PortfolioContext'
import type { ProjectSection as ProjectSectionType, MediaItem } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'
import { toFileUrl } from '../../utils/fileUrl'

export function ProjectSection({ section }: { section: ProjectSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()

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

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Cover image</span>
        {section.coverImageFilename ? (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img
              src={toFileUrl(`${state.portfolioDir}/assets/${section.coverImageFilename}`)}
              style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              alt="Cover"
              loading="lazy"
            />
            <button
              onClick={() => updateSection({ coverImageFilename: undefined })}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
              aria-label="Remove cover image"
            >×</button>
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

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <RichTextEditor
          key={section.id}
          content={section.description}
          onChange={description => updateSection({ description })}
          minHeight={160}
          placeholder="Describe this project…"
          onInsertImage={onInsertImage}
        />
      </div>

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
                  loading="lazy"
                />
                <button
                  onClick={() => removeImage(item.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={`Remove ${item.filename}`}
                >×</button>
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
