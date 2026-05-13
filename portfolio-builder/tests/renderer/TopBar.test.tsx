import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../src/renderer/src/components/editor/TopBar'
import type { Portfolio } from '../../src/renderer/src/types/portfolio'

const blockingPortfolio: Portfolio = {
  schemaVersion: 1,
  name: '',
  slug: 'alice',
  sections: [
    { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '' },
  ],
  publish: {},
}

const warningPortfolio: Portfolio = {
  ...blockingPortfolio,
  name: 'Alice',
  sections: [
    { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Designer and developer.' },
  ],
}

const readyPortfolio: Portfolio = {
  ...warningPortfolio,
  tagline: 'Portfolio maker',
}

let fakePortfolio: Portfolio = blockingPortfolio
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
  fakePortfolio = blockingPortfolio
})

describe('TopBar readiness action', () => {
  it('shows the number of readiness issues in the toolbar button', () => {
    render(<TopBar notify={() => {}} autosaving={false} />)

    expect(screen.getByRole('button', { name: /portfolio readiness/i })).toHaveTextContent('Readiness 3')
  })

  it('summarises readiness counts in the toolbar tooltip', () => {
    render(<TopBar notify={() => {}} autosaving={false} />)

    expect(screen.getByRole('button', { name: /portfolio readiness/i })).toHaveAttribute(
      'title',
      'Portfolio readiness: 2 blocking, 1 warning',
    )
  })

  it('uses the highest readiness severity for the toolbar button colour', () => {
    const { rerender } = render(<TopBar notify={() => {}} autosaving={false} />)

    expect(screen.getByRole('button', { name: /portfolio readiness/i })).toHaveStyle({
      background: '#fee2e2',
      borderColor: '#fca5a5',
      color: '#991b1b',
    })

    fakePortfolio = warningPortfolio
    rerender(<TopBar notify={() => {}} autosaving={false} />)

    expect(screen.getByRole('button', { name: /portfolio readiness/i })).toHaveStyle({
      background: '#fef3c7',
      borderColor: '#f59e0b',
      color: '#92400e',
    })

    fakePortfolio = readyPortfolio
    rerender(<TopBar notify={() => {}} autosaving={false} />)

    expect(screen.getByRole('button', { name: /portfolio readiness/i })).toHaveStyle({
      background: '#dcfce7',
      borderColor: '#86efac',
      color: '#166534',
    })
  })

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
