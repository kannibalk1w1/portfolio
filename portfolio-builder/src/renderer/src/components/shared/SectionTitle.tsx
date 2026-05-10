/**
 * SectionTitle — an editable heading used at the top of every section editor.
 *
 * Renders as an invisible input styled like an <h2>. On hover a subtle
 * underline hint appears; on focus it shows a blue underline and light
 * background so it's clearly in edit mode. The title is saved on every
 * keystroke via the onChange callback.
 */
import { useState } from 'react'

interface Props {
  title: string
  onChange: (title: string) => void
}

export function SectionTitle({ title, onChange }: Props) {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <input
      value={title}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      placeholder="Section title"
      style={{
        display: 'block',
        width: '100%',
        fontSize: 20,
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: 24,
        padding: '2px 6px',
        background: focused ? '#f5f5ff' : 'transparent',
        border: 'none',
        borderRadius: focused ? 4 : 0,
        borderBottom: `2px solid ${focused ? '#4f46e5' : hovered ? '#ddd' : 'transparent'}`,
        outline: 'none',
        boxSizing: 'border-box',
        cursor: 'text',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    />
  )
}
