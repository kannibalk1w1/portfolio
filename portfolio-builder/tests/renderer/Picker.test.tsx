import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Picker } from '../../src/renderer/src/pages/Picker'

const mockOpenPortfolio = vi.fn()
const mockSetRoot = vi.fn().mockResolvedValue(undefined)

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: {
      portfoliosRoot: '/fake/root',
      openPortfolioSlug: null,
      portfolio: null,
      portfolioDir: null,
      dirty: false
    },
    openPortfolio: mockOpenPortfolio,
    setRoot: mockSetRoot,
    savePortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    closePortfolio: vi.fn(),
  })
}))

const mockApi = {
  listCyps: vi.fn().mockResolvedValue([
    { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
    { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' }
  ]),
  writePortfolio: vi.fn().mockResolvedValue(undefined),
  deletePortfolio: vi.fn().mockResolvedValue(undefined),
  getPortfoliosRoot: vi.fn().mockResolvedValue('/fake/root'),
  openFolderPicker: vi.fn().mockResolvedValue(null),
}

Object.defineProperty(global, 'window', {
  value: { api: mockApi },
  writable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.listCyps.mockResolvedValue([
    { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
    { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' }
  ])
})

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

  it('shows "Add new CYP" button', async () => {
    render(<Picker />)
    expect(await screen.findByText(/add new cyp/i)).toBeInTheDocument()
  })

  it('renders a delete button for each CYP', async () => {
    render(<Picker />)
    expect(await screen.findByLabelText('Delete Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Bob')).toBeInTheDocument()
  })

  it('clicking delete asks for confirmation, not immediate delete', async () => {
    render(<Picker />)
    const del = await screen.findByLabelText('Delete Alice')
    fireEvent.click(del)
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    expect(mockApi.deletePortfolio).not.toHaveBeenCalled()
  })

  it('cancel returns the row to normal state without deleting', async () => {
    render(<Picker />)
    fireEvent.click(await screen.findByLabelText('Delete Alice'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument()
    expect(mockApi.deletePortfolio).not.toHaveBeenCalled()
    // Alice row still rendered
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('confirming delete calls the API with the right slug and refreshes the list', async () => {
    mockApi.listCyps
      .mockResolvedValueOnce([
        { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
        { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' },
      ])
      .mockResolvedValueOnce([
        { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' },
      ])

    render(<Picker />)
    fireEvent.click(await screen.findByLabelText('Delete Alice'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    })

    expect(mockApi.deletePortfolio).toHaveBeenCalledWith('/fake/root', 'alice')
    // Initial mount call + post-delete refresh call
    expect(mockApi.listCyps).toHaveBeenCalledTimes(2)
  })

  it('opens are not triggered when clicking the delete button', async () => {
    render(<Picker />)
    fireEvent.click(await screen.findByLabelText('Delete Alice'))
    expect(mockOpenPortfolio).not.toHaveBeenCalled()
  })

  it('only one row can be in confirm state at a time', async () => {
    render(<Picker />)
    fireEvent.click(await screen.findByLabelText('Delete Alice'))
    fireEvent.click(screen.getByLabelText('Delete Bob'))
    // Two confirms would mean the legend appears twice; only one should be visible
    expect(screen.getAllByText(/cannot be undone/i)).toHaveLength(1)
  })

  it('creates a new CYP and refreshes the list', async () => {
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

    // Click "Add new CYP"
    const addBtn = await screen.findByText(/add new cyp/i)
    fireEvent.click(addBtn)

    // Type a name
    const input = screen.getByPlaceholderText('CYP name')
    fireEvent.change(input, { target: { value: 'New CYP' } })

    // Click Create
    await act(async () => {
      fireEvent.click(screen.getByText('Create'))
    })

    // List should refresh and show the new CYP
    expect(mockApi.writePortfolio).toHaveBeenCalledOnce()
    expect(mockApi.listCyps).toHaveBeenCalledTimes(2)
  })
})
