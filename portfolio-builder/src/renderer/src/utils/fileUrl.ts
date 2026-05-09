/**
 * Convert a filesystem path to an asset://localhost/ URL.
 * Using an explicit hostname makes relative URL resolution predictable —
 * Chromium won't treat the Windows drive letter as a hostname.
 * The main process protocol handler strips 'localhost' before resolving.
 */
export function toFileUrl(fsPath: string): string {
  const forward = fsPath.replace(/\\/g, '/')
  // Remove any leading slash so the path becomes: C:/Users/... or /home/...
  const clean = forward.startsWith('/') ? forward : `/${forward}`
  return `asset://localhost${clean}`
}
