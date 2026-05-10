import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../../src/renderer/src/components/editor/Sidebar'
import type { Portfolio } from '../../src/renderer/src/types/portfolio'

const fakePortfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  sections: [{ id: 'about', type: 'about', title: 'About', visible: true, bio: '' }],
  publish: {
    ftp: { host: 'h', port: 21, user: 'u', remotePath: '/', secure: false },
  },
}

const mockUpdatePortfolio = vi.fn()

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: {
      portfoliosRoot: '/r',
      openPortfolioSlug: 'alice',
      portfolio: fakePortfolio,
      portfolioDir: '/r/alice',
      dirty: false,
    },
    openPortfolio: vi.fn(),
    setRoot: vi.fn(),
    savePortfolio: vi.fn(),
    updatePortfolio: mockUpdatePortfolio,
    closePortfolio: vi.fn(),
  }),
}))

// SnapshotPanel pulls in `window.api.listSnapshots` on mount; we never open it
// in these tests, so a no-op stub is fine.
vi.mock('../../src/renderer/src/components/shared/SnapshotPanel', () => ({
  SnapshotPanel: () => null,
}))

const mockApi = {
  previewSite: vi.fn(),
  exportSite: vi.fn(),
  publishFtp: vi.fn(),
  listSnapshots: vi.fn().mockResolvedValue([]),
}

Object.defineProperty(global, 'window', {
  value: { api: mockApi },
  writable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Sidebar action buttons — feedback', () => {
  it('passes the publish call to the API with the configured FTP details', async () => {
    mockApi.publishFtp.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    })

    expect(mockApi.publishFtp).toHaveBeenCalledWith('/r/alice', fakePortfolio.publish.ftp)
  })

  it('shows the thrown error message when publish rejects', async () => {
    mockApi.publishFtp.mockRejectedValue(new Error('No FTP password is stored for this portfolio.'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    })

    const status = await screen.findByTestId('action-status')
    expect(status).toHaveTextContent(/no ftp password is stored/i)
  })

  it('shows a success message when publish resolves', async () => {
    mockApi.publishFtp.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    })

    expect(await screen.findByTestId('action-status')).toHaveTextContent(/published/i)
  })

  it('shows the thrown error message when preview rejects', async () => {
    mockApi.previewSite.mockRejectedValue(new Error('Build failed: missing template'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    })

    expect(await screen.findByTestId('action-status')).toHaveTextContent(/build failed: missing template/i)
  })

  it('shows the thrown error message when export rejects', async () => {
    mockApi.exportSite.mockRejectedValue(new Error('Permission denied'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    })

    expect(await screen.findByTestId('action-status')).toHaveTextContent(/permission denied/i)
  })

  it('disables action buttons while one action is in progress', async () => {
    let resolvePublish: () => void = () => {}
    mockApi.publishFtp.mockImplementation(
      () => new Promise<void>(resolve => { resolvePublish = resolve }),
    )

    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    const publishBtn = await screen.findByRole('button', { name: /publishing/i })
    expect(publishBtn).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()

    await act(async () => {
      resolvePublish()
    })
  })
})
