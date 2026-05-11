/**
 * ThemeCustomiser — lets users override accent colour, background colour,
 * and body font on top of their chosen theme preset.
 *
 * Rendered in the About section editor, just below the ThemePicker.
 * Changes are stored in portfolio.customisation and applied as CSS
 * variable overrides in the generated site.
 */
import type { PortfolioCustomisation } from '../../types/portfolio'

const FONTS = [
  { label: 'Default (System)',      value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { label: 'Georgia (Serif)',       value: "Georgia, 'Times New Roman', serif" },
  { label: 'Palatino (Elegant)',    value: "'Palatino Linotype', Palatino, serif" },
  { label: 'Arial (Clean)',         value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana (Readable)',    value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet (Modern)',    value: "'Trebuchet MS', sans-serif" },
  { label: 'Courier (Typewriter)',  value: "'Courier New', Courier, monospace" },
]

interface Props {
  value: PortfolioCustomisation
  onChange: (c: PortfolioCustomisation) => void
}

export function ThemeCustomiser({ value, onChange }: Props) {
  const c = value

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 12,
  }
  const lbl: React.CSSProperties = { fontSize: 12, color: '#555' }
  const sub: React.CSSProperties = { fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }

  return (
    <div>
      <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 12 }}>Customise</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Accent colour */}
        <div style={row}>
          <div style={{ width: 110, flexShrink: 0 }}>
            <div style={lbl}>Accent colour</div>
            <div style={sub}>Buttons, links &amp; highlights</div>
          </div>
          <input
            type="color"
            value={c.accentColour ?? '#6366f1'}
            onChange={e => onChange({ ...c, accentColour: e.target.value })}
            style={{ width: 36, height: 28, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }}
          />
          {c.accentColour && (
            <button onClick={() => onChange({ ...c, accentColour: undefined })}
              style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>

        {/* Background colour */}
        <div style={row}>
          <div style={{ width: 110, flexShrink: 0 }}>
            <div style={lbl}>Background</div>
            <div style={sub}>Page colour behind cards</div>
          </div>
          <input
            type="color"
            value={c.bgColour ?? '#f1f5f9'}
            onChange={e => onChange({ ...c, bgColour: e.target.value })}
            style={{ width: 36, height: 28, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }}
          />
          {c.bgColour && (
            <button onClick={() => onChange({ ...c, bgColour: undefined })}
              style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>

        {/* Font */}
        <div style={row}>
          <div style={{ width: 110, flexShrink: 0 }}>
            <div style={lbl}>Font</div>
            <div style={sub}>Text style throughout portfolio</div>
          </div>
          <select
            value={c.fontFamily ?? ''}
            onChange={e => onChange({ ...c, fontFamily: e.target.value || undefined })}
            style={{ flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, fontFamily: c.fontFamily ?? 'inherit' }}
          >
            <option value="">Theme default</option>
            {FONTS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
