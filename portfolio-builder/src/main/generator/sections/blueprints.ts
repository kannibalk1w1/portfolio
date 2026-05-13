import type { BlueprintsSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { renderDescription } from '../sanitize'

export function renderBlueprints(section: BlueprintsSection): string {
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="blueprints-container"><p class="empty">Blueprint rendering coming soon.</p></div>
</section>`
}
