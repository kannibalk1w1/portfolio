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

  it('emits the always-on Open Graph and Twitter meta tags', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain(`<meta property="og:title" content="Alice&#39;s Portfolio">`)
    expect(html).toContain(`<meta property="og:type" content="profile">`)
    expect(html).toContain(`<meta property="og:site_name" content="Alice&#39;s Portfolio">`)
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image">`)
    expect(html).toContain(`<meta name="twitter:title" content="Alice&#39;s Portfolio">`)
  })

  it('emits og:image and twitter:image when the About section has an avatar', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Hello world', avatarFilename: 'avatar.jpg' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain(`<meta property="og:image" content="assets/avatar.jpg">`)
    expect(html).toContain(`<meta name="twitter:image" content="assets/avatar.jpg">`)
  })

  it('omits og:image and twitter:image when no avatar is set', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('twitter:image')
  })

  it('emits og:description and twitter:description when bio is non-empty', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    // basicPortfolio bio is 'Hello world'
    expect(html).toContain(`<meta property="og:description" content="Hello world">`)
    expect(html).toContain(`<meta name="twitter:description" content="Hello world">`)
  })

  it('omits og:description / twitter:description when bio is empty or whitespace', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '   ' },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('twitter:description')
  })

  it('truncates og:description to 200 characters with an ellipsis when bio is longer', async () => {
    const longBio = 'A'.repeat(250)
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: longBio },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    const match = html.match(/<meta property="og:description" content="([^"]*)">/)
    expect(match).not.toBeNull()
    const content = match![1]
    expect(content.length).toBe(200)
    expect(content.endsWith('…')).toBe(true)
  })

  it('emits only always-on tags when there is no About section at all', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('og:title')
    expect(html).toContain('twitter:card')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('twitter:image')
    expect(html).not.toContain('twitter:description')
  })
})
