import { usePortfolio } from '../../store/PortfolioContext'
import type { AboutSection as AboutSectionType, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'

export function AboutSection({ section }: { section: AboutSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

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
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>About Me</h2>

      <label style={{ display: 'block', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Name</span>
        <input
          value={state.portfolio?.name ?? ''}
          onChange={e => updatePortfolio({ ...state.portfolio!, name: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Bio</span>
        <textarea
          value={section.bio}
          onChange={e => updateSection({ bio: e.target.value })}
          rows={4}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
      </label>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Avatar photo</span>
        {section.avatarFilename && (
          <img
            src={`file://${state.portfolioDir}/assets/${section.avatarFilename}`}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', display: 'block', marginBottom: 8 }}
            alt="Avatar"
          />
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
