import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { createSnapshot, listSnapshots, restoreSnapshot, pruneSnapshots } from '../../../src/main/portfolio/snapshot'

const TMP = join(__dirname, '__tmp_snap__')

function makePortfolioDir(slug: string) {
  const dir = join(TMP, slug)
  mkdirSync(join(dir, 'assets'), { recursive: true })
  mkdirSync(join(dir, 'snapshots'), { recursive: true })
  writeFileSync(join(dir, 'portfolio.json'), JSON.stringify({ schemaVersion: 1, name: slug }))
  return dir
}

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('snapshot system', () => {
  it('createSnapshot creates a timestamped folder with portfolio.json inside', async () => {
    const dir = makePortfolioDir('alice')
    await createSnapshot(dir)
    const snaps = await listSnapshots(dir)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].id).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('restoreSnapshot restores portfolio.json from snapshot', async () => {
    const dir = makePortfolioDir('alice')
    await createSnapshot(dir)
    writeFileSync(join(dir, 'portfolio.json'), JSON.stringify({ schemaVersion: 1, name: 'MODIFIED' }))
    const snaps = await listSnapshots(dir)
    await restoreSnapshot(dir, snaps[0].id)
    const raw = readFileSync(join(dir, 'portfolio.json'), 'utf-8')
    expect(JSON.parse(raw).name).toBe('alice')
  })

  it('listSnapshots returns entries sorted newest-first', async () => {
    const dir = makePortfolioDir('alice')
    await createSnapshot(dir)
    await new Promise(r => setTimeout(r, 20))
    await createSnapshot(dir)
    const snaps = await listSnapshots(dir)
    expect(snaps).toHaveLength(2)
    expect(snaps[0].id > snaps[1].id).toBe(true)
  })

  it('pruneSnapshots removes entries older than maxAgeDays', async () => {
    const dir = makePortfolioDir('alice')
    const snapDir = join(dir, 'snapshots')
    mkdirSync(join(snapDir, '2000-01-01T00-00-00-000'), { recursive: true })
    writeFileSync(join(snapDir, '2000-01-01T00-00-00-000', 'portfolio.json'), '{}')
    await createSnapshot(dir) // recent one
    await pruneSnapshots(dir, 0)
    const snaps = await listSnapshots(dir)
    expect(snaps.every(s => s.id !== '2000-01-01T00-00-00-000')).toBe(true)
    expect(snaps.length).toBeGreaterThanOrEqual(1) // recent snapshot survives
  })
})
