import type { SkillsSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

// Same palette as the editor — deterministic colour from label
const BADGE_COLOURS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#f3e8ff', text: '#7e22ce' },
  { bg: '#fee2e2', text: '#dc2626' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#fdf4ff', text: '#a21caf' },
]

function badgeColour(label: string) {
  let h = 0
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return BADGE_COLOURS[h % BADGE_COLOURS.length]
}

export function renderSkills(section: SkillsSection): string {
  const badges = section.items
    .map(item => {
      const { bg, text } = badgeColour(item.label)
      const bgFinal = item.colour ?? bg
      const textFinal = item.colour ? '#ffffff' : text
      return `<span class="skill-badge" style="background:${bgFinal};color:${textFinal};">${escHtml(item.label)}</span>`
    })
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="skills-grid">${badges || '<p class="empty">No skills listed yet.</p>'}</div>
</section>`
}
