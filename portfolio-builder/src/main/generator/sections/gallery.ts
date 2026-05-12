import type { GallerySection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { renderDescription } from '../sanitize'

export function renderGallery(section: GallerySection): string {
  const items = section.items
    .map(item => `
    <div class="gallery-item">
      <img
        src="assets/${escSrc(item.filename)}"
        class="lb-trigger"
        data-src="assets/${escSrc(item.filename)}"
        alt="${escHtml(item.alt ?? item.caption ?? item.filename)}"
        decoding="async">
      ${item.caption ? `<p class="gallery-caption">${escHtml(item.caption)}</p>` : ''}
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="gallery-grid">${items || '<p class="empty">No items yet.</p>'}</div>
</section>`
}
