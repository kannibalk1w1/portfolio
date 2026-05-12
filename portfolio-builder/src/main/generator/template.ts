/**
 * wrapTemplate — generates the full HTML page for an exported portfolio.
 *
 * Design decisions:
 *  - Hero banner: dark-to-indigo gradient, avatar + name. The avatar is taken
 *    from the About section so it only appears once (not duplicated below).
 *  - Sections render as white cards on a light-grey page background.
 *  - Section titles use an indigo left-border accent.
 *  - Gallery/project images use a CSS zoom-on-hover + a vanilla-JS lightbox
 *    instead of opening in a new tab — better UX with no external dependencies.
 *  - Code blocks use a dark background for readability.
 *  - A lightbox <div> and small inline script are only emitted when the page
 *    actually contains gallery or project images.
 */

import type { Portfolio, Section, ThemeName, PortfolioCustomisation } from '../../renderer/src/types/portfolio'
import { escHtml, escSrc } from './utils'

function buildCustomisationCss(c: PortfolioCustomisation | undefined): string {
  if (!c) return ''
  const lines: string[] = []
  if (c.accentColour) lines.push(`--accent:${c.accentColour};--accent-d:${c.accentColour};`)
  if (c.bgColour)     lines.push(`--bg:${c.bgColour};`)
  const root = lines.length ? `:root{${lines.join('')}}` : ''
  const body = c.fontFamily ? `body{font-family:${c.fontFamily};}` : ''
  return root + body
}

// ---------------------------------------------------------------------------
// Theme CSS variable blocks
// Each theme overrides the same set of custom properties; the rest of the CSS
// is identical across all themes.
// ---------------------------------------------------------------------------

function themeVars(theme: ThemeName = 'launchpad'): string {
  const themes: Record<ThemeName, string> = {
    launchpad: `
      --accent:#6366f1; --accent-d:#4f46e5;
      --nav-bg:#0f172a;
      --dark:#0f172a; --dark-2:#1e293b;
      --text:#1e293b; --muted:#64748b;
      --bg:#f1f5f9; --card:#ffffff; --border:#e2e8f0;
      --hero-from:#0f172a; --hero-to:#312e81;
      --hero-color:#ffffff; --hero-avatar-border:rgba(255,255,255,0.25);
      --code-bg:#0f172a;`,
    midnight: `
      --accent:#10b981; --accent-d:#059669;
      --nav-bg:#030712;
      --dark:#030712; --dark-2:#111827;
      --text:#f1f5f9; --muted:#94a3b8;
      --bg:#0f172a; --card:#1e293b; --border:#334155;
      --hero-from:#030712; --hero-to:#064e3b;
      --hero-color:#ffffff; --hero-avatar-border:rgba(255,255,255,0.2);
      --code-bg:#030712;`,
    warm: `
      --accent:#f59e0b; --accent-d:#d97706;
      --nav-bg:#1c0a00;
      --dark:#1c0a00; --dark-2:#431407;
      --text:#1c1917; --muted:#78716c;
      --bg:#fef7ee; --card:#ffffff; --border:#f5e6d3;
      --hero-from:#1c0a00; --hero-to:#7c2d12;
      --hero-color:#ffffff; --hero-avatar-border:rgba(255,255,255,0.25);
      --code-bg:#1c1917;`,
    minimal: `
      --accent:#0ea5e9; --accent-d:#0284c7;
      --nav-bg:#0f172a;
      --dark:#0f172a; --dark-2:#1e293b;
      --text:#334155; --muted:#94a3b8;
      --bg:#ffffff; --card:#ffffff; --border:#f1f5f9;
      --hero-from:#f0f9ff; --hero-to:#bae6fd;
      --hero-color:#0f172a; --hero-avatar-border:rgba(0,0,0,0.15);
      --code-bg:#1e293b;`,
  }
  return themes[theme] ?? themes.launchpad
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible && s.showInNav !== false)
    .map(s => s.isSubPage
      ? `<a href="${escHtml(s.id)}.html">${escHtml(s.title)} <span class="nav-ext">↗</span></a>`
      : `<a href="#${escHtml(s.id)}">${escHtml(s.title)}</a>`
    )
    .join('\n      ')
}

const PAGE_ICONS: Record<string, string> = {
  about: '👤', gallery: '🖼', videos: '🎬', models: '📦', games: '🎮',
  code: '💻', custom: '📝', project: '📋', links: '🔗', skills: '⭐',
  timeline: '📅', quote: '❝', embed: '📡', content: '🧩', stats: '📊', buttons: '🔘',
}

export function buildPageCards(sections: Section[]): string {
  const cards = sections
    .map(s => `<a href="${escHtml(s.id)}.html" class="page-card">
      <span class="page-card-icon">${PAGE_ICONS[s.type] ?? '📄'}</span>
      <span>${escHtml(s.title)}</span>
    </a>`)
    .join('\n    ')
  return `\n<section class="section">
  <h2 class="section-title">My Pages</h2>
  <div class="page-cards">${cards}</div>
</section>`
}

function needsModelViewer(sections: Section[]): boolean {
  return sections.some(s => s.type === 'models' && s.visible && (s as any).items?.length > 0)
}

function needsHighlight(sections: Section[]): boolean {
  return sections.some(s => s.type === 'code' && s.visible && (s as any).items?.length > 0)
}

function needsLightbox(sections: Section[]): boolean {
  return sections.some(s =>
    s.visible &&
    (s.type === 'gallery' || s.type === 'project') &&
    ((s as any).items?.length > 0 || (s as any).coverImageFilename)
  )
}

export function wrapTemplate(
  portfolio: Portfolio,
  body: string,
  opts?: { inlineModelViewer?: string | null },
): string {
  let modelViewerScript = ''
  if (needsModelViewer(portfolio.sections)) {
    if (opts?.inlineModelViewer) {
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

  // Avatar and optional hero banner live in the hero block.
  const aboutSection = portfolio.sections.find(s => s.type === 'about' && s.visible)
  const bio = aboutSection?.type === 'about' ? aboutSection.bio : ''
  const avatarFilename = aboutSection?.type === 'about' ? aboutSection.avatarFilename : undefined
  const heroImageFilename = aboutSection?.type === 'about' ? aboutSection.heroImageFilename : undefined
  const showAvatarInHero = aboutSection?.type === 'about' ? aboutSection.showAvatarInHero !== false : false
  const heroAvatar = (showAvatarInHero && avatarFilename)
    ? `<img src="assets/${escSrc(avatarFilename)}" class="hero-avatar" alt="${escHtml(portfolio.name)}">`
    : ''
  const heroBg = heroImageFilename
    ? `<img src="assets/${escSrc(heroImageFilename)}" class="hero-bg" alt="" aria-hidden="true">
    <div class="hero-overlay"></div>`
    : ''

  const ogImage = avatarFilename
    ? `<meta property="og:image" content="assets/${escHtml(avatarFilename)}">
  <meta name="twitter:image" content="assets/${escHtml(avatarFilename)}">`
    : ''
  const trimmedBio = bio.trim()
  const ogDescription = trimmedBio
    ? (() => {
        const desc = escHtml(truncate(trimmedBio, 200))
        return `<meta property="og:description" content="${desc}">
  <meta name="twitter:description" content="${desc}">`
      })()
    : ''

  const siteTitle = `${portfolio.name}'s Portfolio`
  const escSiteTitle = escHtml(siteTitle)

  const lightbox = needsLightbox(portfolio.sections) ? `
  <div id="lb" role="dialog" aria-modal="true" aria-label="Image viewer">
    <button id="lb-close" aria-label="Close">&times;</button>
    <img id="lb-img" src="" alt="">
  </div>
  <script>
    (function () {
      var lb  = document.getElementById('lb');
      var img = document.getElementById('lb-img');
      function open(src) { img.src = src; lb.classList.add('open'); }
      function close()   { lb.classList.remove('open'); img.src = ''; }
      document.querySelectorAll('.lb-trigger').forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); open(el.dataset.src || el.src); });
      });
      document.getElementById('lb-close').addEventListener('click', close);
      lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();
  </script>` : ''

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
  ${ogImage}
  ${ogDescription}
  ${modelViewerScript}
  ${highlightLinks}
  <style>
    /* ── Variables (theme-specific values injected here) ── */
    :root {
      ${themeVars(portfolio.theme)}
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    }

    /* ── User customisation overrides ── */
    ${buildCustomisationCss(portfolio.customisation)}

    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; overscroll-behavior: none; }
    img { max-width: 100%; display: block; }

    /* ── Navigation ── */
    nav { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); display: flex; align-items: center; gap: 20px; padding: 0 32px; height: 56px; }
    .nav-brand { color: #fff; font-weight: 700; font-size: 15px; white-space: nowrap; flex-shrink: 0; }
    .nav-links { display: flex; gap: 2px; overflow-x: auto; flex: 1; scrollbar-width: none; }
    .nav-links::-webkit-scrollbar { display: none; }
    nav a { text-decoration: none; color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500; padding: 6px 12px; border-radius: 6px; white-space: nowrap; transition: color .15s, background .15s; }
    nav a:hover { color: #fff; background: rgba(255,255,255,0.1); }

    /* ── Hero ── */
    .hero { background: linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%); padding: 64px 32px 60px; text-align: center; color: var(--hero-color); position: relative; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 0.55; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.82) 35%, rgba(0,0,0,0.18) 100%); }
    .hero-content { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0; }
    .hero-avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--hero-avatar-border); margin: 0 auto 20px; }
    .hero h1 { font-size: 42px; font-weight: 800; letter-spacing: -1px; line-height: 1.1; }
    .hero-tagline { margin-top: 10px; font-size: 16px; opacity: 0.72; font-weight: 400; }

    /* ── Layout ── */
    .sections-wrapper { max-width: 1040px; margin: 0 auto; padding: 40px 24px 56px; display: flex; flex-direction: column; }
    .section + .section { margin-top: 20px; }
    .section.no-gap { margin-top: 0 !important; }
    .section { background: var(--card); border-radius: var(--radius); padding: 32px 36px; box-shadow: var(--shadow); }
    .section-title { font-size: 19px; font-weight: 700; margin-bottom: 24px; padding-left: 14px; border-left: 4px solid var(--accent); color: var(--text); }

    /* ── About ── */
    .about-block { display: flex; gap: 28px; align-items: flex-start; }
    .about-text { flex: 1; min-width: 0; }
    .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

    /* ── Gallery ── */
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
    .gallery-item { display: flex; flex-direction: column; gap: 5px; }
    .gallery-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; cursor: zoom-in; transition: transform .2s, box-shadow .2s; }
    .gallery-item img:hover { transform: scale(1.04); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .gallery-caption { font-size: 12px; color: var(--muted); text-align: center; }

    /* ── Videos ── */
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .video-item video { width: 100%; border-radius: 8px; }
    .video-caption { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }

    /* ── 3D Models ── */
    .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .model-label { text-align: center; font-size: 13px; color: var(--muted); margin-top: 8px; }

    /* ── Games ── */
    .game-item { margin-bottom: 32px; }
    .game-item:last-child { margin-bottom: 0; }
    .game-item h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }

    /* ── Code ── */
    .code-block { margin-bottom: 20px; }
    .code-block:last-child { margin-bottom: 0; }
    .code-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 6px; font-family: monospace; text-transform: uppercase; letter-spacing: .05em; }
    pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 18px 20px; overflow-x: auto; }
    code { font-family: 'Cascadia Code', 'Fira Code', ui-monospace, monospace; font-size: 13px; }
    pre code { color: inherit; background: none; }

    /* ── Project ── */
    .project-cover { width: 100%; max-height: 420px; object-fit: cover; border-radius: 10px; margin-bottom: 24px; cursor: zoom-in; transition: opacity .2s; }
    .project-cover:hover { opacity: .92; }
    .project-description { margin-bottom: 24px; }

    /* ── Rich-text content (section-description) ── */
    .section-description { font-size: 15px; margin-bottom: 20px; line-height: 1.75; }
    .section-description > * + * { margin-top: .65em; }
    .section-description h1 { font-size: 1.6em; font-weight: 700; }
    .section-description h2 { font-size: 1.35em; font-weight: 700; }
    .section-description h3 { font-size: 1.15em; font-weight: 600; }
    .section-description h4 { font-size: 1em; font-weight: 600; }
    .section-description ul, .section-description ol { padding-left: 1.4em; }
    .section-description blockquote { border-left: 3px solid var(--border); padding-left: 12px; color: var(--muted); }
    .section-description hr { border: none; border-top: 2px solid var(--border); margin: 14px 0; }
    .section-description a { color: var(--accent-d); }
    .section-description mark { background: #fef08a; border-radius: 2px; padding: 0 2px; }
    .section-description sup { font-size: .75em; vertical-align: super; }
    .section-description sub { font-size: .75em; vertical-align: sub; }
    .section-description code { background: var(--bg); padding: 1px 5px; border-radius: 3px; font-size: .9em; font-family: monospace; }
    .section-description pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; }
    .section-description pre code { background: none; padding: 0; color: inherit; }
    .section-description img { max-width: 100%; border-radius: 6px; margin: 8px 0; cursor: zoom-in; }
    .section-description table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .section-description td, .section-description th { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
    .section-description th { background: var(--bg); font-weight: 600; }

    /* ── Links ── */
    .links-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .link-card { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--text); font-size: 15px; font-weight: 500; transition: border-color .15s, box-shadow .15s, color .15s; }
    .link-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: var(--accent-d); }
    .link-icon { font-size: 20px; line-height: 1; }

    /* ── Colour palette (inline rich-text node) ── */
    .colour-palette { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; padding: 2px 0; }
    .palette-swatch { width: 28px; height: 28px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.12); }

    /* ── Styled dividers ── */
    hr.divider-line  { border: none; border-top: 2px solid var(--border); margin: 16px 0; }
    hr.divider-dots  { border: none; margin: 16px 0; text-align: center; }
    hr.divider-dots::before  { content: '· · ·'; font-size: 20px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-stars { border: none; margin: 16px 0; text-align: center; }
    hr.divider-stars::before { content: '★  ★  ★'; font-size: 16px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-thick { border: none; border-top: 4px solid var(--border); margin: 16px 0; }
    /* plain <hr> fallback */
    hr { border: none; border-top: 2px solid var(--border); margin: 16px 0; }

    /* ── Skills ── */
    .skills-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .skill-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 14px; font-weight: 600; }

    /* ── Timeline ── */
    .timeline { display: flex; flex-direction: column; gap: 0; border-left: 2px solid var(--border); padding-left: 0; margin-left: 8px; }
    .tl-item { display: flex; gap: 16px; align-items: flex-start; padding: 0 0 24px 24px; position: relative; }
    .tl-dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid var(--card); flex-shrink: 0; }
    .tl-content { flex: 1; }
    .tl-date { font-size: 12px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
    .tl-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .tl-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }

    /* ── Progress bars (Content block) ── */
    .cb-progress { margin-bottom: 4px; }
    .progress-label { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .progress-bar-bg   { background: var(--border); border-radius: 999px; height: 10px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }

    /* ── Stats ── */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; }
    .stat-card  { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 16px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 8px; }
    .stat-label { font-size: 13px; color: var(--muted); font-weight: 500; }

    /* ── Buttons / CTA ── */
    .cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
    .cta-btn  { display: inline-block; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600; transition: opacity .15s, transform .1s; }
    .cta-btn:hover { opacity: .88; transform: translateY(-1px); }
    .cta-primary   { background: var(--accent); color: #fff; }
    .cta-secondary { background: #e0e7ff; color: var(--accent-d); }
    .cta-outline   { background: transparent; color: var(--accent); border: 2px solid var(--accent); }

    /* ── Two-column block (inside Content section) ── */
    .cb-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    /* ── Quote section ── */
    .quotes-list { display: flex; flex-direction: column; gap: 20px; }
    .quote-block { border-left: 4px solid var(--accent); padding: 12px 20px; background: var(--bg); border-radius: 0 8px 8px 0; margin: 0; }
    .quote-text  { font-size: 17px; font-style: italic; color: var(--dark-2); line-height: 1.7; margin: 0 0 8px; }
    .quote-attr  { font-size: 13px; color: var(--muted); font-style: normal; display: block; }

    /* ── Callout boxes (from rich-text editor) ── */
    .callout { padding: 12px 16px 12px 44px; border-radius: 8px; border-left: 4px solid; margin: 14px 0; position: relative; }
    .callout::before { position: absolute; left: 12px; top: 13px; font-size: 16px; }
    .callout > * + * { margin-top: 0.4em; }
    .callout-info    { background: #eff6ff; border-color: #3b82f6; }
    .callout-info::before    { content: 'ℹ️'; }
    .callout-tip     { background: #f0fdf4; border-color: #22c55e; }
    .callout-tip::before     { content: '💡'; }
    .callout-warning { background: #fffbeb; border-color: #f59e0b; }
    .callout-warning::before { content: '⚠️'; }
    .callout-note    { background: #faf5ff; border-color: #8b5cf6; }
    .callout-note::before    { content: '📝'; }

    /* ── Content blocks ── */
    .content-blocks { display: flex; flex-direction: column; gap: 20px; }
    .cb { }
    .cb-image img, .cb-video video, .cb-video iframe { width: 100%; border-radius: 8px; display: block; }
    .cb-caption { font-size: 13px; color: var(--muted); margin-top: 6px; text-align: center; }
    .cb-quote { border-left: 4px solid var(--accent); padding: 12px 20px; background: var(--bg); border-radius: 0 8px 8px 0; margin: 0; }

    /* ── Empty state ── */
    .empty { color: var(--muted); font-size: 14px; font-style: italic; }

    /* ── Lightbox ── */
    #lb { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 200; align-items: center; justify-content: center; }
    #lb.open { display: flex; }
    #lb-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain; }
    #lb-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 36px; cursor: pointer; line-height: 1; padding: 4px 8px; }
    #lb-close:hover { color: #fff; }

    /* ── Footer ── */
    footer { text-align: center; padding: 28px 24px; color: var(--muted); font-size: 13px; background: var(--card); border-top: 1px solid var(--border); }

    /* ── Hamburger nav ── */
    .nav-hamburger { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
    .nav-hamburger span { display: block; width: 20px; height: 2px; background: rgba(255,255,255,0.8); border-radius: 1px; }

    /* ── Sub-page header ── */
    .subpage-header { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); height: 56px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
    .subpage-back { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .subpage-back:hover { color: #fff; }
    .subpage-title { color: rgba(255,255,255,0.4); font-size: 13px; }
    /* ── Page cards (landing) ── */
    .page-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 8px; }
    .page-card { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 20px 24px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: var(--text); font-weight: 600; font-size: 15px; transition: border-color .15s, box-shadow .15s; }
    .page-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .page-card-icon { font-size: 24px; }
    .nav-ext { font-size: 10px; opacity: 0.7; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .hero { padding: 48px 20px 44px; }
      .hero h1 { font-size: 30px; }
      .hero-avatar { width: 90px; height: 90px; }
      .sections-wrapper { padding: 24px 16px 40px; }
      .section { padding: 24px 20px; }
      nav { padding: 0 16px; gap: 12px; }
      .about-block { flex-direction: column; }
      .cb-two-col { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
      .nav-hamburger { display: flex; }
      nav { position: relative; }
      .nav-links { display: none; flex-direction: column; position: absolute; top: 56px; left: 0; right: 0; background: var(--nav-bg); padding: 8px 0; z-index: 99; border-top: 1px solid rgba(255,255,255,0.08); }
      .nav-links.nav-open { display: flex; }
      .nav-links a { padding: 10px 24px; font-size: 14px; }
    }
  </style>
</head>
<body>

  <nav>
    <span class="nav-brand">${escHtml(portfolio.name)}</span>
    <div class="nav-links" id="rte-nav">
      ${buildNavLinks(portfolio.sections)}
    </div>
    <button class="nav-hamburger" aria-label="Open menu" onclick="document.getElementById('rte-nav').classList.toggle('nav-open')">
      <span></span><span></span><span></span>
    </button>
  </nav>

  <header class="hero">
    ${heroBg}
    ${heroImageFilename ? '<div class="hero-content">' : ''}
    ${heroAvatar}
    <h1>${escHtml(portfolio.name)}</h1>
    ${portfolio.tagline ? `<p class="hero-tagline">${escHtml(portfolio.tagline)}</p>` : ''}
    ${heroImageFilename ? '</div>' : ''}
  </header>

  <div class="sections-wrapper">
    ${body}
  </div>

  ${lightbox}

  <footer>Made with <strong>Launchpad</strong></footer>

  <script>document.addEventListener('click',function(e){if(!e.target.closest('nav')){var n=document.getElementById('rte-nav');if(n)n.classList.remove('nav-open')}})</script>
</body>
</html>`
}

export function wrapSubPage(
  portfolio: Portfolio,
  sectionHtml: string,
  section: Section,
  opts?: { inlineModelViewer?: string | null },
): string {
  const needsMV = section.type === 'models' && (section as any).items?.length > 0
  let modelViewerScript = ''
  if (needsMV) {
    if (opts?.inlineModelViewer) {
      const safe = opts.inlineModelViewer.replace(/<\/script>/gi, '<\\/script>')
      modelViewerScript = `<script type="module">${safe}</script>`
    } else {
      modelViewerScript = `<script type="module" src="assets/vendor/model-viewer.min.js"></script>`
    }
  }

  const needsHighlight = section.type === 'code' && (section as any).items?.length > 0
  const highlightLinks = needsHighlight
    ? `  <link rel="stylesheet" href="assets/vendor/highlight.min.css">
  <script src="assets/vendor/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll())</script>`
    : ''

  const needsLightbox = (section.type === 'gallery' || section.type === 'project') &&
    ((section as any).items?.length > 0 || (section as any).coverImageFilename)

  const lightbox = needsLightbox ? `
  <div id="lb" role="dialog" aria-modal="true" aria-label="Image viewer">
    <button id="lb-close" aria-label="Close">&times;</button>
    <img id="lb-img" src="" alt="">
  </div>
  <script>
    (function () {
      var lb  = document.getElementById('lb');
      var img = document.getElementById('lb-img');
      function open(src) { img.src = src; lb.classList.add('open'); }
      function close()   { lb.classList.remove('open'); img.src = ''; }
      document.querySelectorAll('.lb-trigger').forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); open(el.dataset.src || el.src); });
      });
      document.getElementById('lb-close').addEventListener('click', close);
      lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();
  </script>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(section.title)} — ${escHtml(portfolio.name)}</title>
  ${modelViewerScript}
  ${highlightLinks}
  <style>
    :root {
      ${themeVars(portfolio.theme)}
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    }
    ${buildCustomisationCss(portfolio.customisation)}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; overscroll-behavior: none; }
    img { max-width: 100%; display: block; }
    .subpage-header { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); height: 56px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
    .subpage-back { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .subpage-back:hover { color: #fff; }
    .subpage-title { color: rgba(255,255,255,0.4); font-size: 13px; }
    .sections-wrapper { max-width: 1040px; margin: 0 auto; padding: 40px 24px 56px; }
    .section { background: var(--card); border-radius: var(--radius); padding: 32px 36px; box-shadow: var(--shadow); }
    .section-title { font-size: 19px; font-weight: 700; margin-bottom: 24px; padding-left: 14px; border-left: 4px solid var(--accent); color: var(--text); }
    .section-description { font-size: 15px; margin-bottom: 20px; line-height: 1.75; }
    .section-description > * + * { margin-top: .65em; }
    .section-description h1 { font-size: 1.6em; font-weight: 700; }
    .section-description h2 { font-size: 1.35em; font-weight: 700; }
    .section-description h3 { font-size: 1.15em; font-weight: 600; }
    .section-description ul, .section-description ol { padding-left: 1.4em; }
    .section-description blockquote { border-left: 3px solid var(--border); padding-left: 12px; color: var(--muted); }
    .section-description a { color: var(--accent-d); }
    .section-description mark { background: #fef08a; border-radius: 2px; padding: 0 2px; }
    .section-description code { background: var(--bg); padding: 1px 5px; border-radius: 3px; font-size: .9em; font-family: monospace; }
    .section-description pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; }
    .section-description pre code { background: none; padding: 0; color: inherit; }
    .section-description img { max-width: 100%; border-radius: 6px; margin: 8px 0; cursor: zoom-in; }
    .section-description table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .section-description td, .section-description th { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
    .section-description th { background: var(--bg); font-weight: 600; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
    .gallery-item { display: flex; flex-direction: column; gap: 5px; }
    .gallery-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; cursor: zoom-in; transition: transform .2s, box-shadow .2s; }
    .gallery-item img:hover { transform: scale(1.04); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .gallery-caption { font-size: 12px; color: var(--muted); text-align: center; }
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .video-item video { width: 100%; border-radius: 8px; }
    .video-caption { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .model-label { text-align: center; font-size: 13px; color: var(--muted); margin-top: 8px; }
    .game-item { margin-bottom: 32px; } .game-item:last-child { margin-bottom: 0; }
    .game-item h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }
    .code-block { margin-bottom: 20px; } .code-block:last-child { margin-bottom: 0; }
    .code-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 6px; font-family: monospace; text-transform: uppercase; letter-spacing: .05em; }
    pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 18px 20px; overflow-x: auto; }
    code { font-family: 'Cascadia Code', 'Fira Code', ui-monospace, monospace; font-size: 13px; }
    pre code { color: inherit; background: none; }
    .project-cover { width: 100%; max-height: 420px; object-fit: cover; border-radius: 10px; margin-bottom: 24px; cursor: zoom-in; }
    .links-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .link-card { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--text); font-size: 15px; font-weight: 500; transition: border-color .15s, color .15s; }
    .link-card:hover { border-color: var(--accent); color: var(--accent-d); }
    .link-icon { font-size: 20px; line-height: 1; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .skill-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 14px; font-weight: 600; }
    .timeline { display: flex; flex-direction: column; border-left: 2px solid var(--border); margin-left: 8px; }
    .tl-item { display: flex; gap: 16px; align-items: flex-start; padding: 0 0 24px 24px; position: relative; }
    .tl-dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid var(--card); flex-shrink: 0; }
    .tl-date { font-size: 12px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
    .tl-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .tl-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 16px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 8px; }
    .stat-label { font-size: 13px; color: var(--muted); font-weight: 500; }
    .btn-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .site-btn { display: inline-flex; align-items: center; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: opacity .15s; }
    .site-btn:hover { opacity: .85; }
    .site-btn.primary { background: var(--accent); color: #fff; }
    .site-btn.secondary { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .site-btn.outline { background: transparent; color: var(--accent); border: 2px solid var(--accent); }
    .quote-block { border-left: 4px solid var(--accent); padding: 16px 20px; margin: 8px 0; background: var(--bg); border-radius: 0 8px 8px 0; }
    .quote-text { font-size: 18px; font-style: italic; color: var(--text); line-height: 1.6; }
    .quote-attr { font-size: 13px; color: var(--muted); margin-top: 8px; display: block; }
    .embed-frame { width: 100%; border: none; border-radius: 8px; }
    .cb { margin-bottom: 16px; } .cb:last-child { margin-bottom: 0; }
    .cb-caption { font-size: 13px; color: var(--muted); margin-top: 6px; text-align: center; }
    .cb-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .cb-progress { margin-bottom: 4px; }
    .progress-label { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .progress-bar-bg { background: var(--border); border-radius: 999px; height: 10px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }
    hr.divider-line { border: none; border-top: 2px solid var(--border); margin: 16px 0; }
    hr.divider-dots { border: none; margin: 16px 0; text-align: center; }
    hr.divider-dots::before { content: '· · ·'; font-size: 20px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-stars { border: none; margin: 16px 0; text-align: center; }
    hr.divider-stars::before { content: '★  ★  ★'; font-size: 16px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-thick { border: none; border-top: 4px solid var(--border); margin: 16px 0; }
    .callout { padding: 12px 16px 12px 44px; border-radius: 8px; border-left: 4px solid; margin: 12px 0; position: relative; }
    .callout::before { position: absolute; left: 12px; top: 13px; font-size: 16px; line-height: 1; }
    .callout-info { background: #eff6ff; border-color: #3b82f6; } .callout-info::before { content: 'ℹ️'; }
    .callout-tip { background: #f0fdf4; border-color: #22c55e; } .callout-tip::before { content: '💡'; }
    .callout-warning { background: #fffbeb; border-color: #f59e0b; } .callout-warning::before { content: '⚠️'; }
    .callout-note { background: #faf5ff; border-color: #8b5cf6; } .callout-note::before { content: '📝'; }
    .colour-palette { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; padding: 2px 0; }
    .palette-swatch { width: 28px; height: 28px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.12); }
    #lb { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; }
    #lb.open { display: flex; }
    #lb-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
    #lb-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #fff; font-size: 32px; cursor: pointer; line-height: 1; }
    @media (max-width: 640px) { .section { padding: 24px 20px; } .cb-two-col { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="subpage-header">
    <a href="index.html" class="subpage-back">← ${escHtml(portfolio.name)}'s Portfolio</a>
    <span class="subpage-title">${escHtml(section.title)}</span>
  </header>
  <main class="sections-wrapper">
    ${sectionHtml}
  </main>
  ${lightbox}
  <script>document.addEventListener('click',function(e){if(!e.target.closest('nav')){var n=document.getElementById('rte-nav');if(n)n.classList.remove('nav-open')}})</script>
</body>
</html>`
}
