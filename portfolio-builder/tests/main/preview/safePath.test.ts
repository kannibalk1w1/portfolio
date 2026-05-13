import { describe, it, expect } from 'vitest'
import { join, resolve, sep } from 'path'
import { resolveSafePath } from '../../../src/main/preview/safePath'

const ROOT = resolve('/portfolios/alice/output')

describe('resolveSafePath', () => {
  it('maps "/" to <root>/index.html', () => {
    expect(resolveSafePath(ROOT, '/')).toBe(join(ROOT, 'index.html'))
  })

  it('maps an empty / undefined URL to <root>/index.html', () => {
    expect(resolveSafePath(ROOT, undefined)).toBe(join(ROOT, 'index.html'))
    expect(resolveSafePath(ROOT, '')).toBe(join(ROOT, 'index.html'))
  })

  it('resolves a flat asset path within the root', () => {
    expect(resolveSafePath(ROOT, '/style.css')).toBe(join(ROOT, 'style.css'))
  })

  it('resolves a nested asset path within the root', () => {
    expect(resolveSafePath(ROOT, '/assets/img/cover.jpg'))
      .toBe(join(ROOT, 'assets', 'img', 'cover.jpg'))
  })

  it('strips the query string', () => {
    expect(resolveSafePath(ROOT, '/style.css?v=2')).toBe(join(ROOT, 'style.css'))
  })

  it('strips the fragment', () => {
    // Fragments shouldn't reach the server, but be defensive
    expect(resolveSafePath(ROOT, '/style.css#hash')).toBe(join(ROOT, 'style.css'))
  })

  it('rejects raw ../ traversal', () => {
    expect(resolveSafePath(ROOT, '/../../../etc/passwd')).toBeNull()
  })

  it('rejects URL-encoded ../ traversal', () => {
    expect(resolveSafePath(ROOT, '/%2e%2e%2f%2e%2e%2fetc%2fpasswd')).toBeNull()
    expect(resolveSafePath(ROOT, '/..%2f..%2fetc%2fpasswd')).toBeNull()
  })

  it('rejects mixed-case URL-encoded traversal', () => {
    expect(resolveSafePath(ROOT, '/%2E%2E/%2E%2E/etc/passwd')).toBeNull()
  })

  it('absolute-form URLs are treated as opaque relative paths under root (no host parsing)', () => {
    // We do not parse req.url as a full URL — a malformed client that sends
    // "http://evil.com/..." in the request line will get "http:/evil.com/..."
    // resolved beneath the root. That path will not exist, so the live server
    // returns 404. Either way, the prefix check guarantees we never serve
    // anything above the root.
    const result = resolveSafePath(ROOT, 'http://evil.com/style.css')
    expect(result).not.toBeNull()
    expect(result!.startsWith(ROOT + '/') || result!.startsWith(ROOT + '\\')).toBe(true)
  })

  it('rejects malformed URL-encoded sequences', () => {
    expect(resolveSafePath(ROOT, '/%ZZ')).toBeNull()
  })

  it('treats the root path "/" as safe and points at index.html', () => {
    const result = resolveSafePath(ROOT, '/')
    expect(result).not.toBeNull()
    expect(result!.startsWith(ROOT + sep) || result === join(ROOT, 'index.html')).toBe(true)
  })

  it('allows paths that contain "..." literally (three dots, not a traversal)', () => {
    expect(resolveSafePath(ROOT, '/foo...html')).toBe(join(ROOT, 'foo...html'))
  })

  it('normalizes redundant slashes within the root', () => {
    expect(resolveSafePath(ROOT, '//assets//cover.jpg'))
      .toBe(join(ROOT, 'assets', 'cover.jpg'))
  })

  it('rejects a request that resolves exactly to the parent directory', () => {
    expect(resolveSafePath(ROOT, '/..')).toBeNull()
  })
})
