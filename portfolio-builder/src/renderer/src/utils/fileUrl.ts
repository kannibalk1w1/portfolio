/**
 * Convert a filesystem path to an asset:// URL served by the main process.
 * This works in both dev mode (renderer on localhost) and production (file://).
 * The asset:// protocol is registered in src/main/index.ts.
 */
export function toFileUrl(fsPath: string): string {
  // Normalise all backslashes to forward slashes
  const forward = fsPath.replace(/\\/g, '/')
  // POSIX: /home/user/... → asset:///home/user/...
  // Windows: C:/Users/... → asset:///C:/Users/...
  return forward.startsWith('/') ? `asset://${forward}` : `asset:///${forward}`
}
