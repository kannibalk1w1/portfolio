import type { BlueprintsSection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { renderDescription } from '../sanitize'
import { parseUECopyText } from '../../../renderer/src/lib/blueprint/parseUECopyText'

export function renderBlueprints(section: BlueprintsSection): string {
  const items = section.items.map(item => {
    if (item.kind === 'image') {
      return `
    <div class="bp-item">
      <img
        src="assets/${escSrc(item.content)}"
        class="lb-trigger bp-img"
        data-src="assets/${escSrc(item.content)}"
        alt="${escHtml(item.label ?? item.content)}"
        decoding="async">
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
    }

    const parsed = parseUECopyText(item.content)
    if (!parsed) {
      return `
    <div class="bp-item">
      <div class="bp-parse-error">Blueprint data could not be read.</div>
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
    }

    const jsonData = JSON.stringify(parsed).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    return `
    <div class="bp-item">
      <script type="application/json" id="bp-data-${escHtml(item.id)}">${jsonData}</script>
      <div class="bp-canvas" data-id="${escHtml(item.id)}" style="width:100%;height:400px;"></div>
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
  }).join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="blueprints-list">${items || '<p class="empty">No blueprints yet.</p>'}</div>
</section>`
}
