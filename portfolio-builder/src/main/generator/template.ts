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

export function wrapTemplate(portfolio: Portfolio, body: string): string {
  const modelViewerScript = needsModelViewer(portfolio.sections)
    ? `<script type="module" src="assets/vendor/model-viewer.min.js"></script>`
    : ''
  const highlightLinks = needsHighlight(portfolio.sections)
    ? `  <link rel="stylesheet" href="assets/vendor/highlight.min.css">
  <script src="assets/vendor/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll())</script>`
    : ''

  // Get CYP name from About section if available
  const aboutSection = portfolio.sections.find(s => s.type === 'about')
  const bio = aboutSection?.type === 'about' ? aboutSection.bio : ''

  const siteTitle = `${portfolio.name}'s Portfolio`
  const escSiteTitle = escHtml(siteTitle)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escSiteTitle}</title>
  <meta property="og:title" content="${escSiteTitle}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${escSiteTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escSiteTitle}">
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
    .custom-content { font-size: 15px; }
    .custom-content h2 { font-size: 20px; margin: 16px 0 8px; }
    .custom-content h3 { font-size: 17px; margin: 14px 0 6px; }
    .custom-content p { margin-bottom: 10px; }
    .custom-content ul, .custom-content ol { padding-left: 20px; margin-bottom: 10px; }
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
