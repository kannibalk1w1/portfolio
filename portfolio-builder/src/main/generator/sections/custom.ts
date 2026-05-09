import sanitizeHtml from 'sanitize-html'
import { escHtml } from '../utils'
import type { CustomSection } from '../../../renderer/src/types/portfolio'

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
]

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
}

export function renderCustom(section: CustomSection): string {
  const safe = sanitizeHtml(section.html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
  })
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="custom-content">${safe}</div>
</section>`
}
