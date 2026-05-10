import type { Portfolio, Section } from '../../renderer/src/types/portfolio'
import { escHtml } from './utils'

function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible)
    .map(s => `<a href="#${escHtml(s.id)}">${escHtml(s.title)}</a>`)
    .join('\n    ')
}

function needsModelViewer(sections: Section[]): boolean {
  return sections.some(s => s.type === 'models' && s.visible && (s as any).items?.length > 0)
}

function needsHighlight(sections: Section[]): boolean {
  return sections.some(s => s.type === 'code' && s.visible && (s as any).items?.length > 0)
}

export function wrapTemplate(
  portfolio: Portfolio,
  body: string,
  opts?: { inlineModelViewer?: string | null },
): string {
  let modelViewerScript = ''
  if (needsModelViewer(portfolio.sections)) {
    if (opts?.inlineModelViewer) {
      // Inline the script content so it works from file:// (Chrome blocks
      // <script type="module" src="..."> from file:// but allows inline modules).
      // Escape </script> sequences in the content so the HTML parser doesn't
      // close the tag prematurely.
      const safe = opts.inlineModelViewer.replace(/<\/script>/gi, '<\\/script>')
      modelViewerScript = `<script type="module">${safe}</script>`
    } else {
      modelViewerScript = `<script type="module" src="assets/vendor/model-viewer.min.js"></script>`
    }
  }
  const highlightLinks = needsHighlight(portfolio.sections)
    ? `  <link rel="stylesheet" href="assets/vendor/highlight.min.css">
  <script src="assets/vendor/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll())</script>`
    : ''

  // Get CYP name from About section if available
  const aboutSection = portfolio.sections.find(s => s.type === 'about')
  const bio = aboutSection?.type === 'about' ? aboutSection.bio : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(portfolio.name)}'s Portfolio</title>
  ${modelViewerScript}
  ${highlightLinks}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #222; line-height: 1.6; }
    nav { position: sticky; top: 0; background: white; border-bottom: 1px solid #e0e0e0; padding: 12px 32px; display: flex; gap: 24px; z-index: 100; flex-wrap: wrap; }
    nav a { text-decoration: none; color: #555; font-size: 14px; font-weight: 500; }
    nav a:hover { color: #222; }
    .hero { padding: 48px 32px 32px; max-width: 800px; margin: 0 auto; }
    .hero h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .hero p { color: #555; font-size: 16px; }
    .section { padding: 32px; max-width: 960px; margin: 0 auto; }
    .section-title { font-size: 22px; font-weight: 600; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
    .about-block { display: flex; gap: 24px; align-items: flex-start; }
    .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .gallery-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
    .gallery-item a { display: block; }
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .video-item video { width: 100%; border-radius: 8px; }
    .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .model-label { text-align: center; font-size: 13px; color: #666; margin-top: 6px; }
    .game-item { margin-bottom: 32px; }
    .game-item h3 { margin-bottom: 12px; font-size: 16px; }
    .code-block { margin-bottom: 20px; }
    .code-label { font-size: 12px; color: #888; margin-bottom: 4px; font-family: monospace; }
    pre { background: #f8f8f8; border-radius: 8px; padding: 16px; overflow-x: auto; }
    code { font-family: monospace; font-size: 13px; }
    .section-description { font-size: 15px; margin-bottom: 20px; line-height: 1.7; }
    .section-description > * + * { margin-top: 0.6em; }
    .section-description h1 { font-size: 1.6em; font-weight: 700; }
    .section-description h2 { font-size: 1.35em; font-weight: 700; }
    .section-description h3 { font-size: 1.15em; font-weight: 600; }
    .section-description h4 { font-size: 1em; font-weight: 600; }
    .section-description ul, .section-description ol { padding-left: 1.4em; }
    .section-description blockquote { border-left: 3px solid #ddd; padding-left: 12px; color: #666; }
    .section-description hr { border: none; border-top: 2px solid #e0e0e0; margin: 12px 0; }
    .section-description a { color: #4f46e5; }
    .section-description code { background: #f1f1f1; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; font-family: monospace; }
    .section-description pre { background: #f8f8f8; border-radius: 8px; padding: 16px; overflow-x: auto; }
    .section-description pre code { background: none; padding: 0; }
    .section-description img { max-width: 100%; border-radius: 6px; margin: 8px 0; display: block; }
    .section-description table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .section-description td, .section-description th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    .section-description th { background: #f8f8f8; font-weight: 600; }
    .empty { color: #aaa; font-size: 14px; font-style: italic; }
    .project-cover { width: 100%; max-height: 360px; object-fit: cover; border-radius: 10px; margin-bottom: 20px; }
    .project-description { margin-bottom: 20px; }
    @media (max-width: 600px) {
      .about-block { flex-direction: column; }
      .section { padding: 24px 16px; }
      .hero { padding: 32px 16px 24px; }
    }
  </style>
</head>
<body>
  <nav>
    ${buildNavLinks(portfolio.sections)}
  </nav>
  <div class="hero">
    <h1>${escHtml(portfolio.name)}</h1>
    ${bio ? `<p>${escHtml(bio)}</p>` : ''}
  </div>
  ${body}
</body>
</html>`
}
