import type { EmbedSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

const SAFE = new Set(['http:', 'https:'])
function safeUrl(url: string): string | null {
  try { const u = new URL(url); return SAFE.has(u.protocol) ? url : null } catch { return null }
}

export function renderEmbed(section: EmbedSection): string {
  const url = safeUrl(section.url)
  const embed = url
    ? `<iframe src="${escHtml(url)}" title="${escHtml(section.embedTitle ?? section.title)}" allowfullscreen loading="lazy"
        style="width:100%;height:${section.height}px;border:none;border-radius:8px;display:block;"></iframe>`
    : '<p class="empty">No embed URL set.</p>'

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  ${embed}
</section>`
}
