import type { ButtonsSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

const SAFE = new Set(['http:', 'https:', 'mailto:'])
function safeUrl(url: string): string | null {
  try { const u = new URL(url); return SAFE.has(u.protocol) ? url : null } catch { return null }
}

export function renderButtons(section: ButtonsSection): string {
  const items = section.items
    .filter(i => i.label && safeUrl(i.url))
    .map(item => `<a href="${escHtml(item.url)}" class="cta-btn cta-${escHtml(item.style)}" target="_blank" rel="noopener noreferrer">${escHtml(item.label)}</a>`)
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="cta-row">${items || '<p class="empty">No buttons yet.</p>'}</div>
</section>`
}
