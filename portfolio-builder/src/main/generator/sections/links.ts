import type { LinksSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function safeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return SAFE_PROTOCOLS.has(u.protocol) ? url : null
  } catch {
    return null
  }
}

export function renderLinks(section: LinksSection): string {
  const items = section.items
    .filter(item => item.label && safeUrl(item.url))
    .map(item => `
    <a href="${escHtml(item.url)}" class="link-card" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${escHtml(item.icon)}</span>
      <span class="link-label">${escHtml(item.label)}</span>
    </a>`)
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="links-grid">${items || '<p class="empty">No links yet.</p>'}</div>
</section>`
}
