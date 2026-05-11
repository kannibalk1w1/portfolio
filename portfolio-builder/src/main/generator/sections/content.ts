import type { ContentSection, ContentBlock } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { sanitizeContent } from '../sanitize'

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      if (!block.html) return ''
      return `<div class="cb cb-text">${sanitizeContent(block.html)}</div>`

    case 'image': {
      if (!block.filename) return ''
      const fit = block.objectFit ?? 'cover'
      return `<div class="cb cb-image">
        <img src="assets/${escHtml(block.filename)}" alt="${escHtml(block.alt ?? block.caption ?? block.filename)}" loading="lazy" style="width:100%;border-radius:8px;object-fit:${fit};">
        ${block.caption ? `<p class="cb-caption">${escHtml(block.caption)}</p>` : ''}
      </div>`
    }

    case 'video':
      if (block.embedUrl) {
        return `<div class="cb cb-video">
          ${block.caption ? `<p class="video-caption">${escHtml(block.caption)}</p>` : ''}
          <iframe src="${escHtml(block.embedUrl)}" allowfullscreen loading="lazy"
            style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;display:block;"></iframe>
        </div>`
      }
      if (block.filename) {
        return `<div class="cb cb-video">
          ${block.caption ? `<p class="video-caption">${escHtml(block.caption)}</p>` : ''}
          <video src="assets/${escHtml(block.filename)}" controls preload="metadata"
            style="width:100%;border-radius:8px;display:block;"></video>
        </div>`
      }
      return ''

    case 'quote':
      if (!block.quote) return ''
      return `<blockquote class="cb cb-quote">
        <p class="quote-text">${escHtml(block.quote)}</p>
        ${block.attribution ? `<cite class="quote-attr">— ${escHtml(block.attribution)}</cite>` : ''}
      </blockquote>`

    case 'divider':
      return `<hr class="divider-${block.style ?? 'line'}">`

    case 'progress': {
      if (!block.label && !block.percentage) return ''
      const pct = Math.max(0, Math.min(100, block.percentage))
      const colour = /^#[0-9a-fA-F]{3,8}$/.test(block.colour ?? '') ? block.colour : null
      const fillStyle = colour ? `background:${colour}` : ''
      return `<div class="cb cb-progress">
        <div class="progress-label"><span>${escHtml(block.label)}</span><span>${pct}%</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;${fillStyle}"></div></div>
      </div>`
    }

    case 'two-column':
      return `<div class="cb cb-two-col">
        <div class="two-col-left">${sanitizeContent(block.leftHtml)}</div>
        <div class="two-col-right">${sanitizeContent(block.rightHtml)}</div>
      </div>`

    default:
      return ''
  }
}

export function renderContent(section: ContentSection): string {
  const blocks = section.blocks.map(renderBlock).filter(Boolean).join('\n')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="content-blocks">${blocks || '<p class="empty">No content yet.</p>'}</div>
</section>`
}
