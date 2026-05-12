import type { ModelsSection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { renderDescription } from '../sanitize'

export function renderModels(section: ModelsSection): string {
  const items = section.items
    .map(item => `
    <div class="model-item">
      <model-viewer src="assets/${escSrc(item.filename)}"
        alt="${escHtml(item.label ?? item.filename)}"
        auto-rotate camera-controls
        style="width:100%;height:300px;">
      </model-viewer>
      ${item.label ? `<p class="model-label">${escHtml(item.label)}</p>` : ''}
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="models-grid">${items || '<p class="empty">No models yet.</p>'}</div>
</section>`
}
