import type { GamesSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderGames(section: GamesSection): string {
  const items = section.items
    .map(item => `
    <div class="game-item">
      <h3>${escHtml(item.title)}</h3>
      <iframe
        src="assets/${escHtml(item.folderName)}/${escHtml(item.entryFile)}"
        sandbox="allow-scripts allow-same-origin"
        allowfullscreen
        style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;">
      </iframe>
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${items || '<p class="empty">No games yet.</p>'}
</section>`
}
