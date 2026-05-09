import { usePortfolio } from '../../store/PortfolioContext'
import type { CodeSection as CodeSectionType, CodeItem, CodeLanguage, Section } from '../../types/portfolio'

const LANGUAGES: CodeLanguage[] = [
  'javascript', 'typescript', 'python', 'gdscript',
  'html', 'css', 'rust', 'c', 'cpp', 'json', 'bash', 'other',
]

export function CodeSection({ section }: { section: CodeSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<CodeSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addSnippet() {
    const newItem: CodeItem = {
      id: `snippet-${Date.now()}`,
      language: 'javascript',
      code: '',
    }
    updateSection({ items: [...section.items, newItem] })
  }

  function updateItem(id: string, patch: Partial<CodeItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      {section.items.map(item => (
        <div key={item.id} style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0', alignItems: 'center' }}>
            <input
              value={item.label ?? ''}
              onChange={e => updateItem(item.id, { label: e.target.value })}
              placeholder="Label (optional)"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13 }}
            />
            <select
              value={item.language}
              onChange={e => updateItem(item.id, { language: e.target.value as CodeLanguage })}
              style={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 4, padding: '3px 6px' }}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button
              onClick={() => removeItem(item.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16 }}
              aria-label="Remove snippet"
            >
              ×
            </button>
          </div>
          <textarea
            value={item.code}
            onChange={e => updateItem(item.id, { code: e.target.value })}
            rows={10}
            spellCheck={false}
            style={{ width: '100%', border: 'none', padding: 12, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', display: 'block' }}
          />
        </div>
      ))}
      <button
        onClick={addSnippet}
        style={{ padding: '8px 16px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#888', fontSize: 13 }}
      >
        + Add code snippet
      </button>
    </div>
  )
}
