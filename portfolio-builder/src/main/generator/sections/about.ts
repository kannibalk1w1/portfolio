/**
 * renderAbout — outputs the About section body.
 *
 * The avatar image is rendered in the hero banner by wrapTemplate so it
 * appears at the top of the page rather than duplicating inside this section.
 * This section only renders the bio rich-text.
 */
import type { AboutSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'
import { sanitizeContent } from '../sanitize'

export function renderAbout(section: AboutSection): string {
  // bio is rich-text HTML; fall back to escaping if it looks like plain text
  // (backwards-compatibility for portfolios created before the rich-text upgrade)
  const bioHtml = section.bio.trimStart().startsWith('<')
    ? sanitizeContent(section.bio)
    : `<p>${escHtml(section.bio)}</p>`

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="section-description">${bioHtml}</div>
</section>`
}
