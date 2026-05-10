import { usePortfolio } from '../../store/PortfolioContext'
import type { StatsSection as StatsSectionType, StatItem, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

export function StatsSection({ section }: { section: StatsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<StatsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addStat() {
    const item: StatItem = {
      id: `stat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      value: '', label: '',
    }
    updateSection({ items: [...section.items, item] })
  }

  function updateItem(id: string, patch: Partial<StatItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
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
          placeholder="Introduce these stats…"
        />
      </div>

      {/* Stat cards preview */}
      {section.items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16, padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
          {section.items.map(item => (
            <div key={item.id} style={{ background: 'white', borderRadius: 8, padding: '16px 12px', textAlign: 'center', border: '1px solid #e0e0e0', position: 'relative' }}>
              <button
                onClick={() => removeItem(item.id)}
                style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
                onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
              >×</button>
              <input
                value={item.value}
                onChange={e => updateItem(item.id, { value: e.target.value })}
                placeholder="200+"
                style={{ display: 'block', width: '100%', border: 'none', textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#6366f1', outline: 'none', background: 'transparent', boxSizing: 'border-box', marginBottom: 6 }}
              />
              <input
                value={item.label}
                onChange={e => updateItem(item.id, { label: e.target.value })}
                placeholder="Hours"
                style={{ display: 'block', width: '100%', border: 'none', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#64748b', outline: 'none', background: 'transparent', boxSizing: 'border-box', paddingTop: 6 }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addStat}
        style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
      >
        + Add stat
      </button>
    </div>
  )
}
