import type { BlueprintsSection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { renderDescription } from '../sanitize'
import { applyBlueprintLayout, parseUECopyText } from '../../../renderer/src/lib/blueprint/parseUECopyText'

export function renderBlueprints(section: BlueprintsSection): string {
  const navItems = section.items
    .filter(item => item.label)
    .map(item => `<a href="#${escHtml(blueprintItemId(section.id, item.id))}">${escHtml(item.label!)}</a>`)
    .join('')

  const items = section.items.map(item => {
    const itemId = blueprintItemId(section.id, item.id)
    const itemHeading = item.label
      ? `<h3 class="bp-item-title" id="${escHtml(itemId)}">${escHtml(item.label)}</h3>`
      : ''

    if (item.kind === 'image') {
      return `
    <div class="bp-item">
      ${itemHeading}
      <img
        src="assets/${escSrc(item.content)}"
        class="lb-trigger bp-img"
        data-src="assets/${escSrc(item.content)}"
        alt="${escHtml(item.label ?? item.content)}"
        decoding="async">
    </div>`
    }

    const parsed = parseUECopyText(item.content)
    if (!parsed) {
      return `
    <div class="bp-item">
      ${itemHeading}
      <div class="bp-parse-error">Blueprint data could not be read.</div>
    </div>`
    }

    const jsonData = JSON.stringify(applyBlueprintLayout(parsed, item.layout)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    return `
    <div class="bp-item">
      ${itemHeading}
      <script type="application/json" id="bp-data-${escHtml(item.id)}">${jsonData}</script>
      <div class="bp-canvas" data-id="${escHtml(item.id)}" style="width:100%;height:400px;"></div>
    </div>`
  }).join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  ${navItems ? `<nav class="bp-item-nav">${navItems}</nav>` : ''}
  <div class="blueprints-list">${items || '<p class="empty">No blueprints yet.</p>'}</div>
</section>`
}

function blueprintItemId(sectionId: string, itemId: string): string {
  return `${sectionId}-${itemId}`
}
