import type { VideosSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

export function renderVideos(section: VideosSection): string {
  const items = section.items
    .map(item => {
      const caption = item.caption
        ? `<p class="video-caption">${escHtml(item.caption)}</p>`
        : ''

      if (item.embedUrl) {
        // YouTube / Vimeo embed
        return `
    <div class="video-item">
      ${caption}
      <iframe
        src="${escHtml(item.embedUrl)}"
        allowfullscreen
        loading="lazy"
        style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;display:block;">
      </iframe>
    </div>`
      }

      // Local file
      return `
    <div class="video-item">
      ${caption}
      <video src="assets/${escHtml(item.filename)}" controls preload="metadata"${item.thumbnailFilename ? ` poster="assets/${escHtml(item.thumbnailFilename)}"` : ''}></video>
    </div>`
    })
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="video-grid">${items || '<p class="empty">No videos yet.</p>'}</div>
</section>`
}
