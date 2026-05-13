import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../src/renderer/src/components/editor/Sidebar'
import type { Portfolio } from '../../src/renderer/src/types/portfolio'

const initialPortfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  sections: [{ id: 'about', type: 'about', title: 'About', visible: true, bio: '' }],
  publish: {
    ftp: { host: 'h', port: 21, user: 'u', remotePath: '/', secure: false },
  },
}

let fakePortfolio: Portfolio = initialPortfolio
const mockNotify = vi.fn()
const mockSavePortfolio = vi.fn()
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
    savePortfolio: mockSavePortfolio,
    updatePortfolio: mockUpdatePortfolio,
    closePortfolio: vi.fn(),
  }),
}))

vi.mock('../../src/renderer/src/components/shared/SnapshotPanel', () => ({
  SnapshotPanel: () => null,
}))

const mockApi = {
  previewSite: vi.fn(),
  previewMobile: vi.fn(),
  exportSite: vi.fn(),
  zipExport: vi.fn(),
  offlineExport: vi.fn(),
  publishFtp: vi.fn(),
  listSnapshots: vi.fn().mockResolvedValue([]),
  hasFtpPassword: vi.fn().mockResolvedValue(true),
  setFtpPassword: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  fakePortfolio = initialPortfolio
  mockApi.hasFtpPassword.mockResolvedValue(true)
  window.api = mockApi as any
})

describe('Sidebar action buttons', () => {
  it('opens the FTP publish settings modal from the publish button', async () => {
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
    })

    fireEvent.click(screen.getByRole('button', { name: /publish anyway/i }))

    expect(screen.getByText('FTP Publish Settings')).toBeTruthy()
    expect(await screen.findByText(/saved/i)).toBeTruthy()
  })

  it('publishes through the FTP modal with the configured FTP details', async () => {
    mockApi.publishFtp.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
    fireEvent.click(screen.getByRole('button', { name: /publish anyway/i }))
    await screen.findByText(/saved/i)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish now' }))
    })

    expect(mockApi.publishFtp).toHaveBeenCalledWith('/r/alice', fakePortfolio.publish.ftp)
  })

  it('shows the thrown error message in the FTP modal when publish rejects', async () => {
    mockApi.publishFtp.mockRejectedValue(new Error('No FTP password is stored for this portfolio.'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
    fireEvent.click(screen.getByRole('button', { name: /publish anyway/i }))
    await screen.findByText(/saved/i)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish now' }))
    })

    expect(await screen.findByText(/no ftp password is stored/i)).toBeTruthy()
  })

  it('notifies the thrown error message when preview rejects', async () => {
    mockApi.previewSite.mockRejectedValue(new Error('Build failed: missing template'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    })
    fireEvent.click(screen.getByRole('button', { name: /preview anyway/i }))

    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith('Preview failed: Build failed: missing template', 'error'))
  })

  it('notifies a summary when preview succeeds', async () => {
    mockApi.previewSite.mockResolvedValue({
      htmlFiles: 2,
      visibleSections: 4,
      hiddenSections: 1,
      assetFiles: 7,
      outputDir: '/r/alice/output',
    })
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    })
    fireEvent.click(screen.getByRole('button', { name: /preview anyway/i }))

    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith('Preview ready: 2 pages, 4 visible sections, 7 assets.', 'success'))
  })

  it('warns before previewing when blocking readiness issues exist', async () => {
    mockApi.previewSite.mockResolvedValue(undefined)
    mockSavePortfolio.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(await screen.findByText(/1 blocking readiness issue/i)).toBeTruthy()
    expect(mockApi.previewSite).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /preview anyway/i }))
    })

    expect(mockApi.previewSite).toHaveBeenCalledWith('/r/alice', fakePortfolio)
  })

  it('saves the current portfolio before previewing so reordered items reach the generated site', async () => {
    mockApi.previewSite.mockResolvedValue(undefined)
    mockSavePortfolio.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /preview anyway/i }))
    })

    expect(mockSavePortfolio).toHaveBeenCalledWith(fakePortfolio, { snapshot: false })
    expect(mockSavePortfolio.mock.invocationCallOrder[0]).toBeLessThan(mockApi.previewSite.mock.invocationCallOrder[0])
  })

  it('uses the latest portfolio state when continuing preview from the readiness warning', async () => {
    const reorderedPortfolio: Portfolio = {
      ...initialPortfolio,
      sections: [
        {
          id: 'blueprints-1',
          type: 'blueprints',
          title: 'Blueprints',
          visible: true,
          items: [
            { id: 'bp-2', kind: 'image', content: 'second.png' },
            { id: 'bp-1', kind: 'image', content: 'first.png' },
          ],
        },
      ],
    }

    mockApi.previewSite.mockResolvedValue(undefined)
    mockSavePortfolio.mockResolvedValue(undefined)
    const { rerender } = render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(await screen.findByText(/1 blocking readiness issue/i)).toBeTruthy()

    fakePortfolio = reorderedPortfolio
    rerender(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /preview anyway/i }))
    })

    expect(mockSavePortfolio).toHaveBeenCalledWith(reorderedPortfolio, { snapshot: false })
    expect(mockApi.previewSite).toHaveBeenCalledWith('/r/alice', reorderedPortfolio)
  })

  it('notifies the thrown error message when export rejects', async () => {
    mockApi.exportSite.mockRejectedValue(new Error('Permission denied'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    })
    fireEvent.click(screen.getByRole('button', { name: /export anyway/i }))

    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith('Export failed: Permission denied', 'error'))
  })

  it('disables quick action buttons while one quick action is in progress', async () => {
    let resolveMobile: () => void = () => {}
    mockApi.previewMobile.mockImplementation(
      () => new Promise<void>(resolve => { resolveMobile = resolve }),
    )

    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)
    fireEvent.click(screen.getByRole('button', { name: /Mobile/ }))

    const previewBtn = await screen.findByRole('button', { name: /opening/i })
    expect(previewBtn).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()

    await act(async () => {
      resolveMobile()
    })

    await waitFor(() => expect(screen.getByRole('button', { name: /Mobile/ })).not.toBeDisabled())
  })
})
