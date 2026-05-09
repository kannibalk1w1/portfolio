import { render, screen, fireEvent } from '@testing-library/react'
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
})
