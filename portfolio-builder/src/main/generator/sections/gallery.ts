import type { GallerySection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

export function renderGallery(section: GallerySection): string {
  const items = section.items
    .map(item => `
    <div class="gallery-item">
      <a href="assets/${escHtml(item.filename)}" target="_blank" rel="noopener">
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy">
      </a>
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
