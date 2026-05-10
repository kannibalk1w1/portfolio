import sanitizeHtml from 'sanitize-html'
import { escHtml } from '../utils'
import type { ProjectSection } from '../../../renderer/src/types/portfolio'

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
]
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
}

export function renderProject(section: ProjectSection): string {
  const cover = section.coverImageFilename
    ? `<img src="assets/${escHtml(section.coverImageFilename)}" class="project-cover" alt="Cover image" loading="lazy" decoding="async">`
    : ''

  const safeDescription = sanitizeHtml(section.description, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
  })

  const images = section.items
    .map(item => `
    <div class="gallery-item">
      <a href="assets/${escHtml(item.filename)}" target="_blank" rel="noopener">
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy" decoding="async">
      </a>
    </div>`)
    .join('')

  const gallery = section.items.length > 0
    ? `<div class="gallery-grid">${images}</div>`
    : ''

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${cover}
  ${safeDescription ? `<div class="custom-content project-description">${safeDescription}</div>` : ''}
  ${gallery}
</section>`
}
