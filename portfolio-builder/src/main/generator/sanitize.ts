/**
 * Shared HTML sanitiser for the static site generator.
 *
 * All rich-text content written by TipTap passes through sanitizeContent()
 * before being embedded in generated HTML.  The allowlist is intentionally
 * narrow: only the tags and attributes that TipTap's configured extensions
 * actually produce are permitted, and inline styles are restricted to
 * text-align so alignment works while arbitrary CSS is blocked.
 *
 * renderDescription() is a convenience wrapper used by structured section
 * renderers (Gallery, Videos, etc.) — it returns an empty string when the
 * description is blank so the <div> is omitted entirely from the output.
 */
import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em', 'a',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre', 'hr',
]

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'],
}

const ALLOWED_STYLES = {
  '*': { 'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/] },
}

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}

export function renderDescription(html: string | undefined): string {
  if (!html || html === '<p></p>') return ''
  const safe = sanitizeContent(html)
  return safe ? `<div class="section-description">${safe}</div>` : ''
}
