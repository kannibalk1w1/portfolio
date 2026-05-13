import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'
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
    const summary = await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('Alice')
    expect(html).toContain('Hello world')
    expect(summary).toMatchObject({
      htmlFiles: 1,
      visibleSections: 2,
      hiddenSections: 0,
      assetFiles: 0,
    })
  })

  it('summarises generated pages and copied assets', async () => {
    mkdirSync(join(TMP, 'assets', 'nested'), { recursive: true })
    writeFileSync(join(TMP, 'assets', 'one.jpg'), 'fake')
    writeFileSync(join(TMP, 'assets', 'nested', 'two.png'), 'fake')
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Visible' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, isSubPage: true, items: [] },
        { id: 'gallery-2', type: 'gallery', title: 'Hidden', visible: false, items: [] },
      ],
    }

    const summary = await buildSite(TMP, portfolio)

    expect(summary).toEqual({
      htmlFiles: 2,
      visibleSections: 2,
      hiddenSections: 1,
      assetFiles: 2,
      outputDir: join(TMP, 'output'),
    })
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

  it('every <img> in the rendered output has loading="lazy" and decoding="async"', async () => {
    const portfolio: Portfolio = {
      schemaVersion: 1,
      name: 'Alice',
      slug: 'alice',
      sections: [
        { id: 'about', type: 'about', title: 'About', visible: true, bio: 'b', avatarFilename: 'avatar.jpg' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [
          { id: 'g1', filename: 'one.jpg' },
        ]},
        { id: 'project-1', type: 'project', title: 'Project', visible: true, description: '', coverImageFilename: 'cover.jpg', items: [
          { id: 'p1', filename: 'screenshot.jpg' },
        ]},
      ],
      publish: {},
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')

    const imgs = html.match(/<img\b[^>]*>/g) ?? []
    // Fixture renders exactly 5 imgs: avatar + gallery item + project cover + project gallery item + lightbox #lb-img.
    expect(imgs.length).toBe(5)
    for (const tag of imgs) {
      expect(tag).toMatch(/\bloading="lazy"/)
      expect(tag).toMatch(/\bdecoding="async"/)
    }
  })
})

describe('buildSite — blueprints section', () => {
  const SAMPLE_UE = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000002A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=())
End Object`

  it('renders a paste item as a bp-canvas div with embedded JSON', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-1', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-1', kind: 'paste', content: SAMPLE_UE, label: 'Begin Play' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('class="bp-canvas"')
    expect(html).toContain('id="bp-data-item-1"')
    expect(html).toContain('K2Node_Event')
    expect(html).toContain('Begin Play')
    expect(html).toContain('blueprint-viewer.js')
  })

  it('renders an image item as an img tag', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-2', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-2', kind: 'image', content: 'screenshot.png', label: 'Overview' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('src="assets/screenshot.png"')
    expect(html).toContain('class="lb-trigger bp-img"')
    expect(html).toContain('Overview')
    expect(html).not.toContain('blueprint-viewer.js')
  })

  it('includes lightbox script when a blueprints section has image items', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-4', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-4', kind: 'image', content: 'shot.png' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('id="lb"')
  })

  it('renders an empty blueprints section with placeholder text', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'bp-3', type: 'blueprints', title: 'My Blueprints', visible: true, items: [] } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('No blueprints yet.')
  })

  it('preserves blueprint item order in the generated preview HTML', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-5', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [
            { id: 'item-2', kind: 'image', content: 'second.png', label: 'Second' },
            { id: 'item-1', kind: 'image', content: 'first.png', label: 'First' },
          ],
        } as any,
      ],
    }

    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')

    expect(html.indexOf('Second')).toBeLessThan(html.indexOf('First'))
  })

  it('uses saved blueprint node layout overrides in generated preview HTML', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-6', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{
            id: 'item-6',
            kind: 'paste',
            content: SAMPLE_UE,
            layout: {
              AABBCCDD00000000000000000000001A: { x: 320, y: 180 },
            },
          }],
        } as any,
      ],
    }

    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')

    expect(html).toContain('"posX":320')
    expect(html).toContain('"posY":180')
    expect(html).not.toContain('"posX":0,"posY":0')
  })

  it('renders blueprint item labels as anchors for jumping between items', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-7', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [
            { id: 'first-item', kind: 'image', content: 'first.png', label: 'First Graph' },
            { id: 'second-item', kind: 'image', content: 'second.png', label: 'Second Graph' },
          ],
        } as any,
      ],
    }

    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')

    expect(html).toContain('href="#bp-7-first-item"')
    expect(html).toContain('id="bp-7-first-item"')
    expect(html).toContain('First Graph')
    expect(html.indexOf('First Graph')).toBeLessThan(html.indexOf('Second Graph'))
  })
})

describe('published blueprint viewer', () => {
  it('includes a fit-to-view control for exported blueprint graphs', () => {
    const script = readFileSync(join(__dirname, '../../../src/renderer/assets/vendor/blueprint-viewer.js'), 'utf-8')

    expect(script).toContain("fitBtn.textContent = 'Fit'")
    expect(script).toContain('fitToView()')
  })
})
