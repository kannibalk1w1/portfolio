import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { EmbedSection as EmbedSectionType, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

export function EmbedSection({ section }: { section: EmbedSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const [urlDraft, setUrlDraft] = useState(section.url)

  function updateSection(patch: Partial<EmbedSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function applyUrl() {
    const url = urlDraft.trim()
    if (!url) return
    updateSection({ url: url.match(/^https?:\/\//) ? url : `https://${url}` })
  }

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 13, boxSizing: 'border-box', width: '100%',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <RichTextEditor
          key={section.id}
          content={section.description ?? ''}
          onChange={description => updateSection({ description })}
          minHeight={80}
          placeholder="Describe what's embedded here…"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Embed URL</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyUrl()}
            placeholder="https://codepen.io/… or https://scratch.mit.edu/…"
            style={{ ...inp, flex: 1 }}
          />
          <button
            onClick={applyUrl}
            style={{ padding: '8px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >Apply</button>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Works with CodePen, Scratch, Google Slides, Figma, Replit, Glitch and most embeddable URLs.
        </p>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#666', flexShrink: 0 }}>Height</span>
        <input
          type="range"
          min={200} max={800} step={50}
          value={section.height}
          onChange={e => updateSection({ height: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 13, color: '#555', width: 50, textAlign: 'right' }}>{section.height}px</span>
      </div>

      {section.url ? (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <iframe
            src={section.url}
            style={{ width: '100%', height: section.height, border: 'none', display: 'block' }}
            title={section.title}
            allowFullScreen
          />
        </div>
      ) : (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', borderRadius: 8, border: '1px dashed #ddd', color: '#aaa', fontSize: 14 }}>
          Paste a URL above to preview the embed
        </div>
      )}
    </div>
  )
}
