import { resolve, sep } from 'path'

/**
 * Resolve a request URL against a static-output directory, refusing any path
 * that escapes that directory.
 *
 * The preview server in `ipc.ts` previously did `path.join(outputDir, req.url)`
 * which followed `..` segments out of the output folder, so a request like
 * `/../../etc/passwd` (or its URL-encoded equivalent) returned arbitrary host
 * files. This helper does the splitting, percent-decoding, and prefix check
 * in one place so both the live server and tests use the same logic.
 *
 * Returns the absolute file path on disk, or `null` if the request is unsafe
 * or malformed. We do not use the WHATWG URL parser here because its
 * dot-segment removal masks raw traversal in some cases and its authority
 * parsing misinterprets `//foo` as a host change. We only need the path
 * component, so split-and-decode is both simpler and more predictable.
 */
export function resolveSafePath(outputDir: string, requestUrl: string | undefined): string | null {
  let root: string
  try {
    root = resolve(outputDir)
  } catch {
    return null
  }

  // Take just the path part of the request line; strip query and fragment.
  let path = requestUrl ?? '/'
  path = path.split('?')[0].split('#')[0]
  if (path === '') path = '/'

  // Percent-decode so %2e%2e becomes "..", which the prefix check catches.
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return null
  }

  // Strip leading slashes so resolve() treats the rest as relative to root.
  const trimmed = decoded.replace(/^\/+/, '')
  const target = trimmed === '' ? resolve(root, 'index.html') : resolve(root, trimmed)

  // Final gate: the resolved target must equal root or sit beneath it.
  if (target !== root && !target.startsWith(root + sep)) return null

  return target
}
