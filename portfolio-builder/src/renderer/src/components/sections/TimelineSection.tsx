import { usePortfolio } from '../../store/PortfolioContext'
import type { TimelineSection as TimelineSectionType, TimelineItem, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

export function TimelineSection({ section }: { section: TimelineSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<TimelineSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addItem() {
    const newItem: TimelineItem = {
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      date: '', title: '', description: '',
    }
    updateSection({ items: [...section.items, newItem] })
  }

  function updateItem(id: string, patch: Partial<TimelineItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 13, boxSizing: 'border-box', width: '100%',
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
          placeholder="Introduce this section…"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {section.items.length === 0 && (
          <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>No entries yet — add one below.</p>
        )}
        {section.items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 12, background: '#f8f8f8', borderRadius: 8, padding: '12px 14px', alignItems: 'flex-start' }}>
            {/* Accent dot */}
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 8 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={item.date}
                  onChange={e => updateItem(item.id, { date: e.target.value })}
                  placeholder="Date (e.g. May 2026)"
                  style={{ ...inp, width: 160, flexShrink: 0 }}
                />
                <input
                  value={item.title}
                  onChange={e => updateItem(item.id, { title: e.target.value })}
                  placeholder="Achievement or milestone"
                  style={{ ...inp, flex: 1 }}
                />
              </div>
              <input
                value={item.description ?? ''}
                onChange={e => updateItem(item.id, { description: e.target.value })}
                placeholder="Details (optional)"
                style={inp}
              />
            </div>
            <button
              onClick={() => removeItem(item.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
              aria-label="Remove entry"
            >×</button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
      >
        + Add entry
      </button>
    </div>
  )
}
