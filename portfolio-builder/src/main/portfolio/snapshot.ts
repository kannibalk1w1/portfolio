import { cp, mkdir, readdir, rm, access } from 'fs/promises'
import { join } from 'path'
import type { SnapshotMeta } from '../../renderer/src/types/portfolio'

function timestampId(): string {
  // Format: YYYY-MM-DDTHH-MM-SS-mmm  (colons, dots replaced so it's a valid folder name on Windows)
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23)
}

function idToIso(id: string): string {
  const [datePart, timePart] = id.split('T')
  const parts = timePart.split('-')
  // parts: [hh, mm, ss, mmm]
  return `${datePart}T${parts[0]}:${parts[1]}:${parts[2]}.${parts[3] ?? '000'}Z`
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
    .filter(e => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}$/.test(e))
    .map(id => ({ id, createdAt: idToIso(id) }))
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function restoreSnapshot(portfolioDir: string, snapshotId: string): Promise<void> {
  const src = join(portfolioDir, 'snapshots', snapshotId)
  // Validate snapshot exists before touching portfolio.json
  await access(src).catch(() => {
    throw new Error(`Snapshot not found: ${snapshotId}`)
  })
  await cp(join(src, 'portfolio.json'), join(portfolioDir, 'portfolio.json'))
  await cp(join(src, 'assets'), join(portfolioDir, 'assets'), { recursive: true }).catch(() => {})
}

export async function pruneSnapshots(portfolioDir: string, maxAgeDays: number): Promise<void> {
  const snaps = await listSnapshots(portfolioDir)
  // Cutoff: snapshots whose age (in whole seconds) exceeds maxAgeDays are removed.
  // Truncate to the nearest second so a snapshot created within the current second
  // is never pruned even when maxAgeDays=0.
  const cutoffSec = Math.floor(Date.now() / 1000) - maxAgeDays * 86_400
  for (const snap of snaps) {
    const snapSec = Math.floor(new Date(snap.createdAt).getTime() / 1000)
    if (snapSec < cutoffSec) {
      await rm(join(portfolioDir, 'snapshots', snap.id), { recursive: true, force: true })
    }
  }
}
