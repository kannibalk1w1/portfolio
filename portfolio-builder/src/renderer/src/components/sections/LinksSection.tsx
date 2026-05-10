import { usePortfolio } from '../../store/PortfolioContext'
import type { LinksSection as LinksSectionType, LinkItem, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

// ---------------------------------------------------------------------------
// Icon options and auto-detection from URL
// ---------------------------------------------------------------------------

const ICON_OPTIONS = ['🔗', '🌐', '🐙', '🎮', '📺', '📸', '🐦', '💼', '🎵', '📧', '🖥️', '📝']

function detectIcon(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('github.com'))                        return '🐙'
  if (u.includes('itch.io'))                           return '🎮'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return '📺'
  if (u.includes('instagram.com'))                     return '📸'
  if (u.includes('twitter.com') || u.includes('x.com')) return '🐦'
  if (u.includes('linkedin.com'))                      return '💼'
  if (u.includes('soundcloud.com') || u.includes('spotify.com')) return '🎵'
  if (u.startsWith('mailto:'))                         return '📧'
  if (u.includes('codepen.io') || u.includes('replit.com') || u.includes('glitch.me')) return '🖥️'
  return '🔗'
}

// ---------------------------------------------------------------------------
// Individual link row
// ---------------------------------------------------------------------------

function LinkRow({
  item, onUpdate, onRemove,
}: { item: LinkItem; onUpdate: (patch: Partial<LinkItem>) => void; onRemove: () => void }) {
  const input: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 13, boxSizing: 'border-box' as const, width: '100%',
  }

  function handleUrlChange(url: string) {
    // Auto-detect icon only when the user hasn't manually changed it
    const icon = ICON_OPTIONS.includes(item.icon) && item.icon === detectIcon(item.url)
      ? detectIcon(url)
      : item.icon
    onUpdate({ url, icon })
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8f8f8', borderRadius: 8, padding: '10px 12px' }}>
      {/* Icon picker */}
      <select
        value={item.icon}
        onChange={e => onUpdate({ icon: e.target.value })}
        style={{ fontSize: 18, width: 52, height: 34, border: '1px solid #e0e0e0', borderRadius: 6, background: 'white', cursor: 'pointer', textAlign: 'center' }}
        title="Choose icon"
      >
        {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
      </select>

      {/* Label */}
      <input
        value={item.label}
        onChange={e => onUpdate({ label: e.target.value })}
        placeholder="Label (e.g. My GitHub)"
        style={{ ...input, flex: 1 }}
      />

      {/* URL */}
      <input
        value={item.url}
        onChange={e => handleUrlChange(e.target.value)}
        placeholder="https://…"
        type="url"
        style={{ ...input, flex: 2 }}
      />

      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, flexShrink: 0, padding: '0 4px' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
        onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
        aria-label="Remove link"
      >×</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

export function LinksSection({ section }: { section: LinksSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<LinksSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addLink() {
    const newItem: LinkItem = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: '', label: '', icon: '🔗',
    }
    updateSection({ items: [...section.items, newItem] })
  }

  function updateItem(id: string, patch: Partial<LinkItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
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
          placeholder="Add a short intro for this section…"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {section.items.length === 0 && (
          <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>No links yet — add one below.</p>
        )}
        {section.items.map(item => (
          <LinkRow
            key={item.id}
            item={item}
            onUpdate={patch => updateItem(item.id, patch)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      <button
        onClick={addLink}
        style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
      >
        + Add link
      </button>
    </div>
  )
}
