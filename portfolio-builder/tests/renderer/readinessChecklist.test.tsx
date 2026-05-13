import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { checkPortfolioReadiness } from '../../src/renderer/src/lib/readiness/checkPortfolioReadiness'
import { ReadinessModal } from '../../src/renderer/src/components/shared/ReadinessModal'
import type { Portfolio } from '../../src/renderer/src/types/portfolio'

const basePortfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  tagline: 'Game maker',
  sections: [
    {
      id: 'about',
      type: 'about',
      title: 'About Me',
      visible: true,
      bio: 'I make games and digital art.',
    },
    {
      id: 'gallery-1',
      type: 'gallery',
      title: 'Gallery',
      visible: true,
      items: [
        { id: 'image-1', filename: 'drawing.jpg', caption: 'Robot drawing', alt: 'A robot drawing' },
      ],
    },
    {
      id: 'links-1',
      type: 'links',
      title: 'Links',
      visible: true,
      items: [
        { id: 'link-1', label: 'Play my game', url: 'https://example.com/game', icon: 'link' },
      ],
    },
  ],
  publish: {},
}

describe('checkPortfolioReadiness', () => {
  it('marks a complete portfolio as ready', () => {
    const result = checkPortfolioReadiness(basePortfolio)

    expect(result.ready).toBe(true)
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBe(0)
    expect(result.items).toEqual([])
  })

  it('reports missing required portfolio identity and empty visible sections', () => {
    const portfolio: Portfolio = {
      ...basePortfolio,
      name: '  ',
      tagline: undefined,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }

    const result = checkPortfolioReadiness(portfolio)

    expect(result.ready).toBe(false)
    expect(result.errorCount).toBe(2)
    expect(result.warningCount).toBe(2)
    expect(result.items.map(item => item.message)).toEqual([
      'Portfolio name is missing.',
      'About Me needs a short bio.',
      'Add a tagline so the hero area explains what this portfolio is about.',
      'Gallery is visible but has no items.',
    ])
  })

  it('warns about media without alt text and links with invalid URLs', () => {
    const portfolio: Portfolio = {
      ...basePortfolio,
      sections: [
        {
          id: 'gallery-1',
          type: 'gallery',
          title: 'Gallery',
          visible: true,
          items: [{ id: 'image-1', filename: 'drawing.jpg' }],
        },
        {
          id: 'project-1',
          type: 'project',
          title: 'Project',
          visible: true,
          description: '',
          coverImageFilename: 'cover.jpg',
          items: [{ id: 'shot-1', filename: 'shot.jpg', caption: 'Screenshot' }],
        },
        {
          id: 'links-1',
          type: 'links',
          title: 'Links',
          visible: true,
          items: [{ id: 'link-1', label: 'Broken', url: 'not a url', icon: 'link' }],
        },
      ],
    }

    const result = checkPortfolioReadiness(portfolio)

    expect(result.ready).toBe(false)
    expect(result.errorCount).toBe(1)
    expect(result.warningCount).toBe(2)
    expect(result.items.map(item => item.message)).toEqual([
      'Gallery image "drawing.jpg" is missing alt text.',
      'Project cover image should have supporting text in the description.',
      'Links has an invalid URL: not a url',
    ])
  })
})

describe('ReadinessModal', () => {
  it('shows a ready state when there are no checklist items', () => {
    render(<ReadinessModal portfolio={basePortfolio} onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: /portfolio readiness/i })).toBeTruthy()
    expect(screen.getByText('Ready to publish')).toBeTruthy()
    expect(screen.getByText('No issues found.')).toBeTruthy()
  })

  it('groups blocking issues and warnings', () => {
    const portfolio: Portfolio = {
      ...basePortfolio,
      name: '',
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }

    render(<ReadinessModal portfolio={portfolio} onClose={() => {}} />)

    expect(screen.getByText('2 blocking')).toBeTruthy()
    expect(screen.getByText('1 warning')).toBeTruthy()
    expect(screen.getByText('Portfolio name is missing.')).toBeTruthy()
    expect(screen.getByText('Gallery is visible but has no items.')).toBeTruthy()
  })

  it('jumps to a section when a checklist item is selected', () => {
    const onSelectSection = vi.fn()
    const onClose = vi.fn()
    const portfolio: Portfolio = {
      ...basePortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }

    render(
      <ReadinessModal
        portfolio={portfolio}
        onClose={onClose}
        onSelectSection={onSelectSection}
      />,
    )

    screen.getByRole('button', { name: /Gallery is visible but has no items/i }).click()

    expect(onSelectSection).toHaveBeenCalledWith('gallery-1')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
