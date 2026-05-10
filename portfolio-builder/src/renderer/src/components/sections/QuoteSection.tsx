import { usePortfolio } from '../../store/PortfolioContext'
import type { QuoteSection as QuoteSectionType, QuoteItem, Section } from '../../types/portfolio'
import { SectionTitle } from '../shared/SectionTitle'

export function QuoteSection({ section }: { section: QuoteSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<QuoteSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addQuote() {
    const item: QuoteItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      quote: '', attribution: '',
    }
    updateSection({ items: [...section.items, item] })
  }

  function updateItem(id: string, patch: Partial<QuoteItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 12 }}>
        {section.items.length === 0 && (
          <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>No quotes yet — add one below.</p>
        )}
        {section.items.map(item => (
          <div key={item.id} style={{ position: 'relative', background: '#f8f8ff', border: '1px solid #e0e0e0', borderLeft: '4px solid #6366f1', borderRadius: 8, padding: '14px 16px 14px 20px' }}>
            <button
              onClick={() => removeItem(item.id)}
              style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e94560')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
              aria-label="Remove quote"
            >×</button>
            <textarea
              value={item.quote}
              onChange={e => updateItem(item.id, { quote: e.target.value })}
              placeholder="Enter the quote text…"
              rows={3}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 15, fontStyle: 'italic', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 8, color: '#1e293b', lineHeight: 1.6 }}
            />
            <input
              value={item.attribution ?? ''}
              onChange={e => updateItem(item.id, { attribution: e.target.value })}
              placeholder="Attribution (optional, e.g. Workshop facilitator)"
              style={{ width: '100%', border: 'none', borderTop: '1px solid #e0e0e0', background: 'transparent', fontSize: 12, color: '#64748b', padding: '6px 0 0', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={addQuote}
        style={{ width: '100%', padding: '9px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#aaa', fontSize: 13 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#aaa' }}
      >
        + Add quote
      </button>
    </div>
  )
}
