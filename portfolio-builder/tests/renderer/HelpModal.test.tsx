import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HelpModal, SECTION_HELP } from '../../src/renderer/src/components/shared/HelpModal'

describe('SECTION_HELP data', () => {
  it('has 17 entries', () => {
    expect(SECTION_HELP).toHaveLength(17)
  })

  it('every entry has icon, name, description, and example', () => {
    for (const entry of SECTION_HELP) {
      expect(entry.icon).toBeTruthy()
      expect(entry.name).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(entry.example).toBeTruthy()
    }
  })

  it('file-upload sections have an accepts field', () => {
    const withFiles = ['about', 'gallery', 'videos', 'models', 'games', 'blueprints', 'project', 'content']
    for (const type of withFiles) {
      const entry = SECTION_HELP.find(e => e.type === type)!
      expect(entry.accepts, `${type} should have accepts`).toBeTruthy()
    }
  })

  it('type-only sections do not have an accepts field', () => {
    const typeOnly = ['links', 'skills', 'timeline', 'quote', 'embed', 'stats', 'buttons', 'code']
    for (const type of typeOnly) {
      const entry = SECTION_HELP.find(e => e.type === type)!
      expect(entry.accepts, `${type} should not have accepts`).toBeUndefined()
    }
  })
})

describe('HelpModal', () => {
  it('renders all 17 section names', () => {
    render(<HelpModal onClose={() => {}} />)
    for (const entry of SECTION_HELP) {
      expect(screen.getByText(new RegExp(entry.name))).toBeTruthy()
    }
  })

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn()
    render(<HelpModal onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<HelpModal onClose={onClose} />)
    fireEvent.click(container.firstChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when the modal panel itself is clicked', () => {
    const onClose = vi.fn()
    render(<HelpModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Section Guide'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<HelpModal onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
