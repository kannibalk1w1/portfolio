/** Converts a YouTube/Vimeo share URL to an embed URL. Returns null if unrecognised. */
export function parseVideoUrl(raw: string): string | null {
  const url = raw.trim()
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}
