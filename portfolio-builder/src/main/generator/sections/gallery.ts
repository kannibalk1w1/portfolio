import type { GallerySection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderGallery(section: GallerySection): string {
  const items = section.items
    .map(item => `
    <div class="gallery-item">
      <a href="assets/${escHtml(item.filename)}" target="_blank" rel="noopener">
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy" decoding="async">
      </a>
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="gallery-grid">${items || '<p class="empty">No items yet.</p>'}</div>
</section>`
}
