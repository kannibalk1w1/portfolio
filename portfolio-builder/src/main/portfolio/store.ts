import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import type { CypMeta, Portfolio } from '../../renderer/src/types/portfolio'

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
      results.push({ slug: entry, name: p.name, lastModified: s.mtime.toISOString() })
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
