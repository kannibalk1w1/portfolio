import type { AboutSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderAbout(section: AboutSection): string {
  const avatar = section.avatarFilename
    ? `<img src="assets/${escHtml(section.avatarFilename)}" class="avatar" alt="Avatar">`
    : ''
  return `
<section id="${escHtml(section.id)}" class="section">
  <div class="about-block">
    ${avatar}
    <div class="about-text">
      <p>${escHtml(section.bio)}</p>
    </div>
  </div>
</section>`
}
