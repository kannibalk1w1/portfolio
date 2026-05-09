import type { ModelsSection } from '../../../renderer/src/types/portfolio'

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function renderModels(section: ModelsSection): string {
  const items = section.items
    .map(item => `
    <div class="model-item">
      <model-viewer src="assets/${escHtml(item.filename)}"
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
  <div class="models-grid">${items || '<p class="empty">No models yet.</p>'}</div>
</section>`
}
