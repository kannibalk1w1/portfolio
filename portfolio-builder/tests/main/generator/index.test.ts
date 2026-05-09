import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { buildSite } from '../../../src/main/generator/index'
import type { Portfolio } from '../../../src/renderer/src/types/portfolio'

const TMP = join(__dirname, '__tmp_gen__')

const basicPortfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  sections: [
    { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Hello world' },
    { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
  ],
  publish: {},
}

beforeEach(() => {
  mkdirSync(join(TMP, 'assets'), { recursive: true })
  mkdirSync(join(TMP, 'output'), { recursive: true })
})
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('buildSite', () => {
  it('generates index.html containing the CYP name', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('Alice')
    expect(html).toContain('Hello world')
  })

  it('excludes hidden sections from output', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Visible' },
        { id: 'gallery-1', type: 'gallery', title: 'Hidden Gallery', visible: false, items: [] },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).not.toContain('Hidden Gallery')
  })

  it('includes nav links only for visible sections', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('About Me')
    expect(html).toContain('Gallery')
  })

  it('outputs valid HTML with DOCTYPE', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i)
  })
})
