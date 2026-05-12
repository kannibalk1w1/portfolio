import type { TimelineSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

export function renderTimeline(section: TimelineSection): string {
  const items = section.items
    .filter(i => i.title)
    .map(item => `
    <div class="tl-item">
      <div class="tl-dot"></div>
      <div class="tl-content">
        ${item.date ? `<div class="tl-date">${escHtml(item.date)}</div>` : ''}
        <div class="tl-title">${escHtml(item.title)}</div>
        ${item.description ? `<div class="tl-desc">${escHtml(item.description)}</div>` : ''}
      </div>
    </div>`)
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="timeline">${items || '<p class="empty">No entries yet.</p>'}</div>
</section>`
}
