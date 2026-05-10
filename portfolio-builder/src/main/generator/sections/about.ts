import type { AboutSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { sanitizeContent } from '../sanitize'

export function renderAbout(section: AboutSection): string {
  const avatar = section.avatarFilename
    ? `<img src="assets/${escHtml(section.avatarFilename)}" class="avatar" alt="Avatar">`
    : ''
  // bio is now rich-text HTML; fall back to escaping if it looks like plain text
  const bioHtml = section.bio.trimStart().startsWith('<')
    ? sanitizeContent(section.bio)
    : `<p>${escHtml(section.bio)}</p>`
  return `
<section id="${escHtml(section.id)}" class="section">
  <div class="about-block">
    ${avatar}
    <div class="about-text section-description">${bioHtml}</div>
  </div>
</section>`
}
