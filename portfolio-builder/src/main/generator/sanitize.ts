/**
 * Shared HTML sanitiser for the static site generator.
 *
 * All rich-text content written by TipTap passes through sanitizeContent()
 * before being embedded in generated HTML. The allowlist is intentionally
 * narrow — only tags and attributes that the configured TipTap extensions
 * actually produce are permitted:
 *
 *   - Inline styles are restricted to text-align and color so alignment and
 *     text colour work while arbitrary CSS is blocked.
 *   - <img> src attributes that use the Electron asset:// protocol are
 *     rewritten to relative assets/ paths so they work in exported sites.
 *   - Links are limited to http, https, and mailto schemes.
 *
 * renderDescription() is a convenience wrapper used by structured section
 * renderers (Gallery, Videos, etc.) — it returns an empty string when the
 * description is blank so the <div> is omitted from the output entirely.
 */

import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  // Inline
  'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em', 'a', 'span', 'code',
  // Block
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr',
  // Media
  'img',
  // Table
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

const ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  a:    ['href', 'title', 'target', 'rel'],
  img:  ['src', 'alt', 'width', 'height'],
  td:   ['colspan', 'rowspan'],
  th:   ['colspan', 'rowspan'],
  // style is allowed on these elements but filtered to safe properties below
  '*':  ['style'],
}

const ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
    'color':      [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
  },
}

/**
 * Rewrites asset://localhost/…/assets/FILENAME → assets/FILENAME so images
 * inserted via the Electron custom protocol work in the exported static site.
 */
function rewriteAssetUrl(src: string): string {
  const match = src.match(/\/assets\/([^/]+)$/)
  return match ? `assets/${match[1]}` : src
}

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags:       ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles:     ALLOWED_STYLES,
    allowedSchemes:    ['http', 'https', 'mailto'],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: rewriteAssetUrl(attribs.src ?? '') },
      }),
    },
  })
}

export function renderDescription(html: string | undefined): string {
  if (!html || html === '<p></p>') return ''
  const safe = sanitizeContent(html)
  return safe ? `<div class="section-description">${safe}</div>` : ''
}
