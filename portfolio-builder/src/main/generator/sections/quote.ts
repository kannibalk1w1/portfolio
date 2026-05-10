import type { QuoteSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderQuote(section: QuoteSection): string {
  const items = section.items
    .filter(i => i.quote)
    .map(item => `
    <blockquote class="quote-block">
      <p class="quote-text">${escHtml(item.quote)}</p>
      ${item.attribution ? `<cite class="quote-attr">— ${escHtml(item.attribution)}</cite>` : ''}
    </blockquote>`)
    .join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="quotes-list">${items || '<p class="empty">No quotes yet.</p>'}</div>
</section>`
}
