export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Encode a filename for use in a URL src/href attribute. */
export function escSrc(filename: string): string {
  return encodeURIComponent(filename)
}
