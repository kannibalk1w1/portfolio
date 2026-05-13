import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Picker } from '../../src/renderer/src/pages/Picker'

const mockOpenPortfolio = vi.fn()
const mockSetRoot = vi.fn().mockResolvedValue(undefined)
const mockConfirm = vi.fn()

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: {
      portfoliosRoot: '/fake/root',
      openPortfolioSlug: null,
      portfolio: null,
      portfolioDir: null,
      dirty: false,
    },
    openPortfolio: mockOpenPortfolio,
    setRoot: mockSetRoot,
    savePortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    closePortfolio: vi.fn(),
  }),
}))

const initialCyps = [
  { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
  { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' },
]

const mockApi = {
  listCyps: vi.fn().mockResolvedValue(initialCyps),
  writePortfolio: vi.fn().mockResolvedValue(undefined),
  deletePortfolio: vi.fn().mockResolvedValue(undefined),
  getPortfoliosRoot: vi.fn().mockResolvedValue('/fake/root'),
  openFolderPicker: vi.fn().mockResolvedValue(null),
}

beforeEach(() => {
  vi.clearAllMocks()
  window.api = mockApi as any
  vi.stubGlobal('confirm', mockConfirm)
  mockConfirm.mockReturnValue(true)
  mockApi.listCyps.mockResolvedValue(initialCyps)
})

function hoverPortfolio(name: string) {
  const label = screen.getByText(name)
  const row = label.closest('div[style*="cursor: pointer"]')
  if (!row) throw new Error(`Could not find ${name} row`)
  fireEvent.mouseEnter(row)
}

describe('Picker', () => {
  it('renders CYP names after loading', async () => {
    render(<Picker />)

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('calls openPortfolio when a row is clicked', async () => {
    render(<Picker />)

    const row = await screen.findByText('Alice')
    fireEvent.click(row)

    expect(mockOpenPortfolio).toHaveBeenCalledWith('alice')
  })

  it('shows portfolio creation buttons', async () => {
    render(<Picker />)

    expect(await screen.findByRole('button', { name: '+ New' })).toBeInTheDocument()
    expect(screen.getByText(/add new portfolio/i)).toBeInTheDocument()
  })

  it('renders an accessible delete button when a portfolio row is hovered', async () => {
    render(<Picker />)

    await screen.findByText('Alice')
    hoverPortfolio('Alice')
    hoverPortfolio('Bob')

    expect(screen.getByLabelText('Delete Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Bob')).toBeInTheDocument()
  })

  it('asks for native confirmation before deleting', async () => {
    mockConfirm.mockReturnValue(false)
    render(<Picker />)

    await screen.findByText('Alice')
    hoverPortfolio('Alice')
    fireEvent.click(screen.getByLabelText('Delete Alice'))

    expect(mockConfirm).toHaveBeenCalledWith("Delete Alice's portfolio? This cannot be undone.")
    expect(mockApi.deletePortfolio).not.toHaveBeenCalled()
  })

  it('confirming delete calls the API and removes the row locally', async () => {
    mockConfirm.mockReturnValue(true)
    render(<Picker />)

    await screen.findByText('Alice')
    hoverPortfolio('Alice')

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Delete Alice'))
    })

    expect(mockApi.deletePortfolio).toHaveBeenCalledWith('/fake/root', 'alice')
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('opens are not triggered when clicking the delete button', async () => {
    mockConfirm.mockReturnValue(false)
    render(<Picker />)

    await screen.findByText('Alice')
    hoverPortfolio('Alice')
    fireEvent.click(screen.getByLabelText('Delete Alice'))

    expect(mockOpenPortfolio).not.toHaveBeenCalled()
  })

  it('creates a new portfolio and refreshes the list', async () => {
    mockApi.writePortfolio.mockResolvedValue(undefined)
    mockApi.listCyps
      .mockResolvedValueOnce([
        { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
      ])
      .mockResolvedValueOnce([
        { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
        { slug: 'new-cyp', name: 'New CYP', lastModified: '2026-05-09T10:00:00.000Z' },
      ])

    render(<Picker />)

    fireEvent.click(await screen.findByText(/add new portfolio/i))
    fireEvent.change(screen.getByPlaceholderText('CYP full name'), { target: { value: 'New CYP' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Create'))
    })

    expect(mockApi.writePortfolio).toHaveBeenCalledOnce()
    expect(mockApi.listCyps).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('New CYP')).toBeInTheDocument()
  })
})
