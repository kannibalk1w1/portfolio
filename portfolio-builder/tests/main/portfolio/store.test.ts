import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  listCyps,
  readPortfolio,
  writePortfolio,
  deletePortfolio,
  stripLegacyFtpPassword,
} from '../../../src/main/portfolio/store'
import type { Portfolio } from '../../../src/renderer/src/types/portfolio'

const TMP = join(__dirname, '__tmp_portfolios__')

const makePortfolio = (name: string): Portfolio => ({
  schemaVersion: 1,
  name,
  slug: name.toLowerCase(),
  sections: [{ id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' }],
  publish: {}
})

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('listCyps', () => {
  it('returns empty array when folder is empty', async () => {
    const result = await listCyps(TMP)
    expect(result).toEqual([])
  })

  it('returns one entry per subfolder that has portfolio.json', async () => {
    const aliceDir = join(TMP, 'alice')
    mkdirSync(aliceDir)
    writeFileSync(join(aliceDir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    const result = await listCyps(TMP)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('alice')
    expect(result[0].name).toBe('Alice')
  })

  it('returns portfolios sorted newest-first', async () => {
    // create two portfolios with different mtimes
    const dirs = ['alice', 'bob']
    for (const name of dirs) {
      const dir = join(TMP, name)
      mkdirSync(dir)
      writeFileSync(join(dir, 'portfolio.json'), JSON.stringify(makePortfolio(name)))
      // small delay so mtimes differ
      await new Promise(r => setTimeout(r, 10))
    }
    const result = await listCyps(TMP)
    // bob was written last, should appear first
    expect(result[0].slug).toBe('bob')
    expect(result[1].slug).toBe('alice')
  })
})

describe('readPortfolio', () => {
  it('reads and parses portfolio.json', async () => {
    const dir = join(TMP, 'alice')
    mkdirSync(dir)
    writeFileSync(join(dir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    const p = await readPortfolio(TMP, 'alice')
    expect(p.name).toBe('Alice')
  })
})

describe('writePortfolio', () => {
  it('creates the folder and writes portfolio.json', async () => {
    const p = makePortfolio('Bob')
    await writePortfolio(TMP, p)
    const re = await readPortfolio(TMP, 'bob')
    expect(re.name).toBe('Bob')
  })

  it('creates assets, snapshots, and output subdirectories', async () => {
    const p = makePortfolio('Charlie')
    await writePortfolio(TMP, p)
    expect(existsSync(join(TMP, 'charlie', 'assets'))).toBe(true)
    expect(existsSync(join(TMP, 'charlie', 'snapshots'))).toBe(true)
    expect(existsSync(join(TMP, 'charlie', 'output'))).toBe(true)
  })
})

describe('stripLegacyFtpPassword', () => {
  it('returns the portfolio unchanged when no FTP config is present', () => {
    const p = makePortfolio('Alice')
    const result = stripLegacyFtpPassword(p)
    expect(result.password).toBeNull()
    expect(result.portfolio).toEqual(p)
  })

  it('returns the portfolio unchanged when FTP config has no password', () => {
    const p: Portfolio = {
      ...makePortfolio('Alice'),
      publish: { ftp: { host: 'h', port: 21, user: 'u', remotePath: '/x', secure: false } },
    }
    const result = stripLegacyFtpPassword(p)
    expect(result.password).toBeNull()
    expect(result.portfolio).toEqual(p)
  })

  it('extracts the password and returns a portfolio without it', () => {
    const p: Portfolio = {
      ...makePortfolio('Alice'),
      publish: {
        ftp: {
          host: 'h',
          port: 21,
          user: 'u',
          password: 'plaintext-secret',
          remotePath: '/x',
          secure: false,
        },
      },
    }
    const result = stripLegacyFtpPassword(p)
    expect(result.password).toBe('plaintext-secret')
    expect(result.portfolio.publish.ftp).toEqual({
      host: 'h', port: 21, user: 'u', remotePath: '/x', secure: false,
    })
    expect(result.portfolio.publish.ftp).not.toHaveProperty('password')
  })

  it('does not mutate the input portfolio', () => {
    const p: Portfolio = {
      ...makePortfolio('Alice'),
      publish: {
        ftp: { host: 'h', port: 21, user: 'u', password: 'pw', remotePath: '/', secure: false },
      },
    }
    stripLegacyFtpPassword(p)
    expect(p.publish.ftp?.password).toBe('pw')
  })

  it('treats an empty-string password as no password', () => {
    const p: Portfolio = {
      ...makePortfolio('Alice'),
      publish: {
        ftp: { host: 'h', port: 21, user: 'u', password: '', remotePath: '/', secure: false },
      },
    }
    const result = stripLegacyFtpPassword(p)
    expect(result.password).toBeNull()
  })
})

describe('deletePortfolio', () => {
  it('removes the CYP folder', async () => {
    const dir = join(TMP, 'alice')
    mkdirSync(dir)
    writeFileSync(join(dir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    await deletePortfolio(TMP, 'alice')
    const result = await listCyps(TMP)
    expect(result).toHaveLength(0)
  })
})
