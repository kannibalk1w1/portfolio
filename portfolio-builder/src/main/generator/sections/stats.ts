import type { StatsSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

export function renderStats(section: StatsSection): string {
  const items = section.items
    .filter(i => i.value || i.label)
    .map(item => `
    <div class="stat-card">
      <div class="stat-value">${escHtml(item.value)}</div>
      <div class="stat-label">${escHtml(item.label)}</div>
    </div>`)
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="stats-grid">${items || '<p class="empty">No stats yet.</p>'}</div>
</section>`
}
