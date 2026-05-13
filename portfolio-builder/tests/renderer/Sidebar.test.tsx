import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  mockApi.hasFtpPassword.mockResolvedValue(true)
  window.api = mockApi as any
})

describe('Sidebar action buttons', () => {
  it('opens the FTP publish settings modal from the publish button', async () => {
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
    })

    expect(screen.getByText('FTP Publish Settings')).toBeTruthy()
    expect(await screen.findByText(/saved/i)).toBeTruthy()
  })

  it('publishes through the FTP modal with the configured FTP details', async () => {
    mockApi.publishFtp.mockResolvedValue(undefined)
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
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

    expect(mockNotify).toHaveBeenCalledWith('Build failed: missing template', 'error')
  })

  it('notifies the thrown error message when export rejects', async () => {
    mockApi.exportSite.mockRejectedValue(new Error('Permission denied'))
    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    })

    expect(mockNotify).toHaveBeenCalledWith('Permission denied', 'error')
  })

  it('disables quick action buttons while one quick action is in progress', async () => {
    let resolvePreview: () => void = () => {}
    mockApi.previewSite.mockImplementation(
      () => new Promise<void>(resolve => { resolvePreview = resolve }),
    )

    render(<Sidebar activeSectionId={null} onSelectSection={() => {}} notify={mockNotify} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const previewBtn = await screen.findByRole('button', { name: /opening/i })
    expect(previewBtn).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()

    await act(async () => {
      resolvePreview()
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview' })).not.toBeDisabled())
  })
})
