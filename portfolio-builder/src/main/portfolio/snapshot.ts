import { cp, mkdir, readdir, rm } from 'fs/promises'
import { join } from 'path'
import type { SnapshotMeta } from '../../renderer/src/types/portfolio'

function timestampId(): string {
  // Format: YYYY-MM-DDTHH-MM-SS-mmm  (colons, dots replaced so it's a valid folder name on Windows)
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23)
}

export async function createSnapshot(portfolioDir: string): Promise<void> {
  const id = timestampId()
  const dest = join(portfolioDir, 'snapshots', id)
  await mkdir(dest, { recursive: true })
  await cp(join(portfolioDir, 'portfolio.json'), join(dest, 'portfolio.json'))
  await cp(join(portfolioDir, 'assets'), join(dest, 'assets'), { recursive: true }).catch(() => {})
}

export async function listSnapshots(portfolioDir: string): Promise<SnapshotMeta[]> {
  const dir = join(portfolioDir, 'snapshots')
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  return entries
    .filter(e => /^\d{4}-\d{2}-\d{2}T/.test(e))
    .map(id => ({ id, createdAt: id }))
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function restoreSnapshot(portfolioDir: string, snapshotId: string): Promise<void> {
  const src = join(portfolioDir, 'snapshots', snapshotId)
  await cp(join(src, 'portfolio.json'), join(portfolioDir, 'portfolio.json'))
  await cp(join(src, 'assets'), join(portfolioDir, 'assets'), { recursive: true }).catch(() => {})
}

export async function pruneSnapshots(portfolioDir: string, maxAgeDays: number): Promise<void> {
  const snaps = await listSnapshots(portfolioDir)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = today.getTime() - maxAgeDays * 86_400_000
  for (const snap of snaps) {
    // id format: 2026-05-08T14-32-00 — extract date part
    const datePart = snap.id.slice(0, 10) // "2026-05-08"
    const snapDate = new Date(datePart).getTime()
    if (snapDate < cutoff) {
      await rm(join(portfolioDir, 'snapshots', snap.id), { recursive: true, force: true })
    }
  }
}
