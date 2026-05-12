import type { CustomSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { sanitizeContent } from '../sanitize'

export function renderCustom(section: CustomSection): string {
  const safe = sanitizeContent(section.html)
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="section-description">${safe}</div>
</section>`
}
