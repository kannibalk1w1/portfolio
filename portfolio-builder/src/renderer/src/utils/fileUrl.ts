/**
 * Convert a Windows or POSIX filesystem path to a valid file:// URL.
 * Electron's renderer (Chromium) requires forward slashes and a triple-slash
 * prefix before the drive letter on Windows.
 */
export function toFileUrl(fsPath: string): string {
  // Normalise all backslashes to forward slashes
  const forward = fsPath.replace(/\\/g, '/')
  // Ensure exactly three slashes before the path
  // POSIX: /home/user -> file:///home/user
  // Windows: C:/Users  -> file:///C:/Users
  return forward.startsWith('/') ? `file://${forward}` : `file:///${forward}`
}
