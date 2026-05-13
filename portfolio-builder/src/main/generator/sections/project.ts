import type { ProjectSection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { sanitizeContent } from '../sanitize'

export function renderProject(section: ProjectSection): string {
  const cover = section.coverImageFilename
    ? `<img
        src="assets/${escSrc(section.coverImageFilename)}"
        class="project-cover lb-trigger"
        data-src="assets/${escSrc(section.coverImageFilename)}"
        alt="Cover image"
        loading="lazy"
        decoding="async">`
    : ''

  const images = section.items
    .map(item => `
    <div class="gallery-item">
      <img
        src="assets/${escSrc(item.filename)}"
        class="lb-trigger"
        data-src="assets/${escSrc(item.filename)}"
        alt="${escHtml(item.caption ?? item.filename)}"
        loading="lazy"
        decoding="async">
      ${item.caption ? `<p class="gallery-caption">${escHtml(item.caption)}</p>` : ''}
    </div>`)
    .join('')

  const gallery = section.items.length > 0
    ? `<div class="gallery-grid">${images}</div>`
    : ''

  const descriptionHtml = section.description
    ? sanitizeContent(section.description)
    : ''

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${cover}
  ${descriptionHtml ? `<div class="section-description project-description">${descriptionHtml}</div>` : ''}
  ${gallery}
</section>`
}
