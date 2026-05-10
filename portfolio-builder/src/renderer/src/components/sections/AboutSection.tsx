import { usePortfolio } from '../../store/PortfolioContext'
import type { AboutSection as AboutSectionType, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { ThemePicker } from '../shared/ThemePicker'
import { useImageInserter } from '../../hooks/useImageInserter'
import type { ThemeName } from '../../types/portfolio'
import { toFileUrl } from '../../utils/fileUrl'

export function AboutSection({ section }: { section: AboutSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()

  function updateSection(patch: Partial<AboutSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  async function handleAvatarImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    if (filenames[0]) updateSection({ avatarFilename: filenames[0] })
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <label style={{ display: 'block', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Name</span>
        <input
          value={state.portfolio?.name ?? ''}
          onChange={e => updatePortfolio({ ...state.portfolio!, name: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
        />
      </label>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Bio</span>
        <RichTextEditor
          key={section.id}
          content={section.bio}
          onChange={bio => updateSection({ bio })}
          minHeight={120}
          placeholder="Write a short bio…"
          onInsertImage={onInsertImage}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <ThemePicker
          value={state.portfolio!.theme ?? 'launchpad'}
          onChange={(theme: ThemeName) => updatePortfolio({ ...state.portfolio!, theme })}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Avatar photo</span>
        {section.avatarFilename && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <img
              src={toFileUrl(`${state.portfolioDir}/assets/${section.avatarFilename}`)}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
              alt="Avatar"
            />
            <button
              onClick={() => updateSection({ avatarFilename: undefined })}
              style={{ position: 'absolute', top: -4, right: -4, background: '#e94560', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Remove avatar"
            >×</button>
          </div>
        )}
        <MediaDropzone
          label="Click to choose avatar image"
          filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'] }]}
          multiple={false}
          onFiles={handleAvatarImport}
        />
      </div>
    </div>
  )
}
