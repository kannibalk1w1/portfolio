import type { CodeSection } from '../../../renderer/src/types/portfolio'
import { escHtml } from '../utils'

export function renderCode(section: CodeSection): string {
  const items = section.items
    .map(item => `
    <div class="code-block">
      ${item.label ? `<div class="code-label">${escHtml(item.label)}</div>` : ''}
      <pre><code class="language-${escHtml(item.language)}">${escHtml(item.code)}</code></pre>
    </div>`)
    .join('')
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${items || '<p class="empty">No code snippets yet.</p>'}
</section>`
}
