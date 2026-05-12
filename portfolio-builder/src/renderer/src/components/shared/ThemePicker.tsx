/**
 * ThemePicker — visual theme selector for the portfolio.
 *
 * Renders four clickable mini-preview cards, each showing a scaled-down
 * representation of that theme's nav, hero, and card colours.
 * The selected theme gets an accent-coloured ring.
 */
import type { ThemeName } from '../../types/portfolio'

interface ThemeMeta {
  label: string
  nav: string
  heroFrom: string
  heroTo: string
  heroText: string
  bg: string
  card: string
  border: string
  accent: string
  muted: string
}

const THEMES: Record<ThemeName, ThemeMeta> = {
  launchpad: {
    label: 'Launchpad',
    nav: '#0f172a', heroFrom: '#0f172a', heroTo: '#312e81', heroText: '#fff',
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    accent: '#6366f1', muted: '#94a3b8',
  },
  midnight: {
    label: 'Midnight',
    nav: '#030712', heroFrom: '#030712', heroTo: '#064e3b', heroText: '#fff',
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    accent: '#10b981', muted: '#475569',
  },
  warm: {
    label: 'Warm',
    nav: '#1c0a00', heroFrom: '#1c0a00', heroTo: '#7c2d12', heroText: '#fff',
    bg: '#fef7ee', card: '#ffffff', border: '#f5e6d3',
    accent: '#f59e0b', muted: '#c4b5a0',
  },
  minimal: {
    label: 'Minimal',
    nav: '#0f172a', heroFrom: '#f0f9ff', heroTo: '#bae6fd', heroText: '#0f172a',
    bg: '#ffffff', card: '#ffffff', border: '#f1f5f9',
    accent: '#0ea5e9', muted: '#cbd5e1',
  },
}

interface Props {
  value: ThemeName
  onChange: (theme: ThemeName) => void
}

export function ThemePicker({ value, onChange }: Props) {
  return (
    <div>
      <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 10 }}>Theme</span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(Object.entries(THEMES) as [ThemeName, ThemeMeta][]).map(([key, meta]) => (
          <ThemeCard key={key} id={key} meta={meta} selected={value === key} onSelect={() => onChange(key)} />
        ))}
      </div>
    </div>
  )
}

function ThemeCard({ meta, selected, onSelect }: { id: ThemeName; meta: ThemeMeta; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      title={meta.label}
      style={{
        width: 108,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `2px solid ${selected ? meta.accent : '#e0e0e0'}`,
        boxShadow: selected ? `0 0 0 3px ${meta.accent}33` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Nav bar */}
      <div style={{ height: 11, background: meta.nav }} />

      {/* Hero */}
      <div style={{
        height: 32,
        background: `linear-gradient(135deg, ${meta.heroFrom}, ${meta.heroTo})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${meta.heroText}44`, flexShrink: 0 }} />
        <div>
          <div style={{ height: 3, width: 36, background: `${meta.heroText}cc`, borderRadius: 2, marginBottom: 3 }} />
          <div style={{ height: 2, width: 24, background: `${meta.heroText}66`, borderRadius: 2 }} />
        </div>
      </div>

      {/* Body with 2 card mockups */}
      <div style={{ background: meta.bg, padding: '6px 6px 2px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[36, 28].map((lineW, i) => (
          <div key={i} style={{ background: meta.card, border: `1px solid ${meta.border}`, borderRadius: 4, padding: '5px 6px' }}>
            <div style={{ height: 3, width: 20, background: meta.accent, borderRadius: 2, marginBottom: 4 }} />
            <div style={{ height: 2, width: lineW, background: meta.muted, borderRadius: 2, marginBottom: 2 }} />
            <div style={{ height: 2, width: lineW - 8, background: meta.muted, borderRadius: 2 }} />
          </div>
        ))}
      </div>

      {/* Label */}
      <div style={{
        background: meta.bg, padding: '4px 0 6px',
        textAlign: 'center', fontSize: 11,
        fontWeight: selected ? 700 : 400,
        color: selected ? meta.accent : '#666',
        transition: 'color 0.15s',
      }}>
        {meta.label}
      </div>
    </div>
  )
}
