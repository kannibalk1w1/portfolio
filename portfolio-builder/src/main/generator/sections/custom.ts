import type { CustomSection } from '../../../renderer/src/types/portfolio'

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function renderCustom(section: CustomSection): string {
  // section.html is TipTap-generated HTML — already structured, render as-is
  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  <div class="custom-content">${section.html}</div>
</section>`
}
