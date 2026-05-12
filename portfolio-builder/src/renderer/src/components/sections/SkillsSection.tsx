import { useState, useRef } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { SkillsSection as SkillsSectionType, SkillItem, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'

// ---------------------------------------------------------------------------
// Deterministic badge colour from label text
// ---------------------------------------------------------------------------

const BADGE_COLOURS = [
  { bg: '#dbeafe', text: '#1d4ed8' },  // blue
  { bg: '#dcfce7', text: '#15803d' },  // green
  { bg: '#fce7f3', text: '#be185d' },  // pink
  { bg: '#fef3c7', text: '#b45309' },  // amber
  { bg: '#f3e8ff', text: '#7e22ce' },  // purple
  { bg: '#fee2e2', text: '#dc2626' },  // red
  { bg: '#e0f2fe', text: '#0369a1' },  // sky
  { bg: '#d1fae5', text: '#065f46' },  // emerald
  { bg: '#ffedd5', text: '#c2410c' },  // orange
  { bg: '#fdf4ff', text: '#a21caf' },  // fuchsia
]

function badgeColour(label: string) {
  let h = 0
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return BADGE_COLOURS[h % BADGE_COLOURS.length]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillsSection({ section }: { section: SkillsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function updateSection(patch: Partial<SkillsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addSkill() {
    const label = input.trim()
    if (!label || section.items.some(i => i.label.toLowerCase() === label.toLowerCase())) return
    const newItem: SkillItem = {
      id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label,
    }
    updateSection({ items: [...section.items, newItem] })
    setInput('')
    inputRef.current?.focus()
  }

  function removeSkill(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  function updateSkillColour(id: string, colour: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, colour } : i) })
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

      {/* Badge display */}
      {section.items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {section.items.map(item => {
            const { bg, text } = badgeColour(item.label)
            return (
              <div
                key={item.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: item.colour ?? bg, color: item.colour ? '#ffffff' : text, borderRadius: 999, fontSize: 13, fontWeight: 600 }}
              >
                <input
                  type="color"
                  value={item.colour ?? bg}
                  onChange={e => updateSkillColour(item.id, e.target.value)}
                  title="Pick badge colour"
                  style={{ width: 14, height: 14, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', background: 'none', flexShrink: 0, opacity: 0.7 }}
                />
                {item.label}
                <button
                  onClick={() => removeSkill(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.colour ? '#ffffff' : text, opacity: 0.6, fontSize: 14, lineHeight: 1, padding: 0 }}
                  aria-label={`Remove ${item.label}`}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addSkill() }}
          placeholder="Add a skill or tool (e.g. Python, Blender, Godot)…"
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13 }}
        />
        <button
          onClick={addSkill}
          disabled={!input.trim()}
          style={{ padding: '8px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: input.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, opacity: input.trim() ? 1 : 0.5 }}
        >Add</button>
      </div>
    </div>
  )
}
