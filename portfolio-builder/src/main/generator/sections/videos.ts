import type { VideosSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderVideos(section: VideosSection): string {
  const items = section.items
    .map(item => `
    <div class="video-item">
      <video src="assets/${escHtml(item.filename)}" controls preload="metadata"${item.thumbnailFilename ? ` poster="assets/${escHtml(item.thumbnailFilename)}"` : ''}></video>
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="video-grid">${items || '<p class="empty">No videos yet.</p>'}</div>
</section>`
}
