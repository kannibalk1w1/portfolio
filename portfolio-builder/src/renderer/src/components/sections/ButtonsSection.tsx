import { usePortfolio } from '../../store/PortfolioContext'
import type { ButtonsSection as ButtonsSectionType, ButtonItem, ButtonStyle, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

const STYLE_OPTIONS: { value: ButtonStyle; label: string }[] = [
  { value: 'primary',   label: 'Primary (filled)' },
  { value: 'secondary', label: 'Secondary (muted)' },
  { value: 'outline',   label: 'Outline (bordered)' },
]

const PREVIEW: Record<ButtonStyle, React.CSSProperties> = {
  primary:   { background: '#6366f1', color: 'white', border: '2px solid #6366f1' },
  secondary: { background: '#e0e7ff', color: '#4f46e5', border: '2px solid #e0e7ff' },
  outline:   { background: 'white',   color: '#6366f1', border: '2px solid #6366f1' },
}

export function ButtonsSection({ section }: { section: ButtonsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<ButtonsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addButton() {
    const item: ButtonItem = {
      id: `btn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: '', url: '', style: 'primary',
    }
    updateSection({ items: [...section.items, item] })
  }

  function updateItem(id: string, patch: Partial<ButtonItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 13, boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <RichTextEditor
          key={section.id}
          content={section.description ?? ''}
          onChange={description => updateSection({ description })}
          minHeight={80}
          placeholder="Optional intro text…"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {section.items.length === 0 && (
          <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>No buttons yet.</p>
        )}
        {section.items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8f8f8', borderRadius: 8, padding: '10px 12px' }}>
            {/* Live preview button */}
            <div style={{ ...PREVIEW[item.style], padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, flexShrink: 0, minWidth: 80, textAlign: 'center', cursor: 'default' }}>
              {item.label || 'Button'}
            </div>
            <input value={item.label} onChange={e => updateItem(item.id, { label: e.target.value })} placeholder="Button label" style={{ ...inp, flex: 1 }} />
            <input value={item.url} onChange={e => updateItem(item.id, { url: e.target.value })} placeholder="https://…" type="url" style={{ ...inp, flex: 2 }} />
            <select value={item.style} onChange={e => updateItem(item.id, { style: e.target.value as ButtonStyle })}
              style={{ padding: '7px 8px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, background: 'white', cursor: 'pointer' }}>
              {STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => removeItem(item.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
            >×</button>
          </div>
        ))}
      </div>

      <button onClick={addButton}
        style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
      >
        + Add button
      </button>
    </div>
  )
}
