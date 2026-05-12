import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import type { CypMeta, Portfolio } from '../../renderer/src/types/portfolio'

/** Extracts the first usable image filename from a portfolio for use as a thumbnail. */
function extractThumbnail(p: Portfolio): string | undefined {
  for (const s of p.sections) {
    if (!s.visible) continue
    if (s.type === 'about'   && (s as any).avatarFilename)           return (s as any).avatarFilename
    if (s.type === 'gallery' && (s as any).items?.[0]?.filename)    return (s as any).items[0].filename
    if (s.type === 'project' && (s as any).coverImageFilename)       return (s as any).coverImageFilename
    if (s.type === 'project' && (s as any).items?.[0]?.filename)    return (s as any).items[0].filename
    if (s.type === 'content') {
      const imgBlock = (s as any).blocks?.find((b: any) => b.type === 'image' && b.filename)
      if (imgBlock) return imgBlock.filename
    }
  }
  return undefined
}

export async function listCyps(root: string): Promise<CypMeta[]> {
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch {
    return []
  }
  const results: CypMeta[] = []
  for (const entry of entries) {
    const jsonPath = join(root, entry, 'portfolio.json')
    try {
      const raw = await readFile(jsonPath, 'utf-8')
      const p: Portfolio = JSON.parse(raw)
      const s = await stat(jsonPath)
      results.push({
        slug: entry,
        name: p.name,
        lastModified: s.mtime.toISOString(),
        thumbnailFilename: extractThumbnail(p),
      })
    } catch {
      // not a valid portfolio folder — skip
    }
  }
  return results.sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  )
}

export async function readPortfolio(root: string, slug: string): Promise<Portfolio> {
  const raw = await readFile(join(root, slug, 'portfolio.json'), 'utf-8')
  const p = JSON.parse(raw) as Portfolio
  if (p.schemaVersion !== 1) {
    throw new Error(`Unsupported portfolio schemaVersion: ${p.schemaVersion}`)
  }
  return p
}

export async function writePortfolio(root: string, portfolio: Portfolio): Promise<void> {
  const dir = join(root, portfolio.slug)
  await mkdir(dir, { recursive: true })
  await mkdir(join(dir, 'assets'), { recursive: true })
  await mkdir(join(dir, 'snapshots'), { recursive: true })
  await mkdir(join(dir, 'output'), { recursive: true })
  await writeFile(join(dir, 'portfolio.json'), JSON.stringify(portfolio, null, 2), 'utf-8')
}

export async function deletePortfolio(root: string, slug: string): Promise<void> {
  await rm(join(root, slug), { recursive: true, force: true })
}

export function stripLegacyFtpPassword(
  portfolio: Portfolio,
): { portfolio: Portfolio; password: string | null } {
  const ftp = portfolio.publish?.ftp
  const password = ftp?.password
  if (!password) {
    return { portfolio, password: null }
  }
  // Build a copy of the FTP config without the password field
  const cleanFtp = { ...ftp }
  delete cleanFtp.password
  return {
    portfolio: { ...portfolio, publish: { ...portfolio.publish, ftp: cleanFtp } },
    password,
  }
}
