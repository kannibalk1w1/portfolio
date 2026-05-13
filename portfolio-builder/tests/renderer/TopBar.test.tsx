import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../src/renderer/src/components/editor/TopBar'
import type { Portfolio } from '../../src/renderer/src/types/portfolio'

const fakePortfolio: Portfolio = {
  schemaVersion: 1,
  name: '',
  slug: 'alice',
  sections: [
    { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' },
  ],
  publish: {},
}

const mockClosePortfolio = vi.fn()
const mockSavePortfolio = vi.fn()

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: {
      portfolio: fakePortfolio,
      dirty: false,
      lastSaved: null,
    },
    closePortfolio: mockClosePortfolio,
    savePortfolio: mockSavePortfolio,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TopBar readiness action', () => {
  it('opens the portfolio readiness modal from the toolbar', () => {
    render(<TopBar notify={() => {}} autosaving={false} />)

    fireEvent.click(screen.getByRole('button', { name: /portfolio readiness/i }))

    expect(screen.getByRole('dialog', { name: /portfolio readiness/i })).toBeTruthy()
    expect(screen.getByText('Portfolio name is missing.')).toBeTruthy()
  })

  it('passes readiness section selections back to the editor shell', () => {
    const onSelectSection = vi.fn()
    render(<TopBar notify={() => {}} autosaving={false} onSelectSection={onSelectSection} />)

    fireEvent.click(screen.getByRole('button', { name: /portfolio readiness/i }))
    fireEvent.click(screen.getByRole('button', { name: /About Me needs a short bio/i }))

    expect(onSelectSection).toHaveBeenCalledWith('about')
  })
})
