import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlueprintsSection } from '../../src/renderer/src/components/sections/BlueprintsSection'
import type { BlueprintsSection as BlueprintsSectionType, Portfolio } from '../../src/renderer/src/types/portfolio'

const section: BlueprintsSectionType = {
  id: 'blueprints-1',
  type: 'blueprints',
  title: 'Blueprints',
  visible: true,
  items: [
    {
      id: 'bp-1',
      kind: 'paste',
      content: 'Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"\n   NodeGuid=AABBCCDD00000000000000000000001A\nEnd Object',
      layout: {
        AABBCCDD00000000000000000000001A: { x: 120, y: 80 },
      },
    },
  ],
}

const fakePortfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  sections: [section],
  publish: {},
}

const mockUpdatePortfolio = vi.fn()

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: {
      portfolio: fakePortfolio,
      portfolioDir: '/r/alice',
    },
    updatePortfolio: mockUpdatePortfolio,
  }),
}))

vi.mock('../../src/renderer/src/hooks/useImageInserter', () => ({
  useImageInserter: () => vi.fn(),
}))

vi.mock('../../src/renderer/src/lib/blueprint/BlueprintViewer', () => ({
  BlueprintViewer: ({ onLayoutChange }: { onLayoutChange?: (layout: Record<string, { x: number; y: number }>) => void }) => (
    <button type="button" onClick={() => onLayoutChange?.({ AABBCCDD00000000000000000000001A: { x: 300, y: 200 } })}>
      Move mocked node
    </button>
  ),
}))

describe('BlueprintsSection layout controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the portfolio dirty path when a blueprint node layout changes', () => {
    render(<BlueprintsSection section={section} />)

    fireEvent.click(screen.getByRole('button', { name: 'Move mocked node' }))

    expect(mockUpdatePortfolio).toHaveBeenCalledWith({
      ...fakePortfolio,
      sections: [{
        ...section,
        items: [{
          ...section.items[0],
          layout: {
            AABBCCDD00000000000000000000001A: { x: 300, y: 200 },
          },
        }],
      }],
    })
  })

  it('can reset a pasted blueprint item layout', () => {
    render(<BlueprintsSection section={section} />)

    fireEvent.click(screen.getByRole('button', { name: /reset layout/i }))

    expect(mockUpdatePortfolio).toHaveBeenCalledWith({
      ...fakePortfolio,
      sections: [{
        ...section,
        items: [{
          ...section.items[0],
          layout: undefined,
        }],
      }],
    })
  })
})
