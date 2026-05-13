# Section Help Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `?` button to the editor toolbar that opens a centred modal listing all 17 section types with a plain-English description, example, and accepted file types.

**Architecture:** A new `HelpModal.tsx` component holds all section data as a static array and renders a fixed-position overlay modal. `TopBar.tsx` gets a `showHelp` boolean state and a `?` circle button. No context changes, no API calls, no persistent state.

**Tech Stack:** React 19, TypeScript 5.9, `@testing-library/react` + vitest (already installed).

---

## File Map

| Status | Path | Responsibility |
|---|---|---|
| Create | `src/renderer/src/components/shared/HelpModal.tsx` | Static section data + modal component |
| Modify | `src/renderer/src/components/editor/TopBar.tsx` | Add `?` button + render HelpModal |
| Create | `tests/renderer/HelpModal.test.tsx` | Unit tests for HelpModal |

---

## Task 1: HelpModal component

**Files:**
- Create: `portfolio-builder/src/renderer/src/components/shared/HelpModal.tsx`
- Create: `portfolio-builder/tests/renderer/HelpModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `portfolio-builder/tests/renderer/HelpModal.test.tsx`:

```tsx
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
    // The backdrop is the outermost div (fixed overlay)
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd portfolio-builder
npm run test:renderer -- --reporter=verbose 2>&1 | grep -A5 "HelpModal"
```

Expected: FAIL — `Cannot find module '../../src/renderer/src/components/shared/HelpModal'`

- [ ] **Step 3: Implement the component**

Create `portfolio-builder/src/renderer/src/components/shared/HelpModal.tsx`:

```tsx
import { useEffect } from 'react'

export interface SectionHelpEntry {
  type: string
  icon: string
  name: string
  description: string
  example: string
  accepts?: string
}

export const SECTION_HELP: SectionHelpEntry[] = [
  {
    type: 'about',
    icon: '👤',
    name: 'About Me',
    description: 'Introduce yourself — your name, what you\'re into, and a bit about you.',
    example: '"I\'m 16, I love making games and 3D art…"',
    accepts: 'Avatar: JPG, PNG, GIF, WEBP · Hero banner: JPG, PNG, WEBP, AVIF, HEIC, TIFF',
  },
  {
    type: 'gallery',
    icon: '🖼',
    name: 'Gallery',
    description: 'Show images and GIFs in a grid.',
    example: 'Screenshots of your Godot project, art you\'ve made, photos of things you\'ve built',
    accepts: 'JPG, PNG, GIF, WEBP, SVG, AVIF, HEIC, TIFF',
  },
  {
    type: 'videos',
    icon: '🎬',
    name: 'Videos',
    description: 'Upload video files or paste a YouTube/Vimeo link.',
    example: 'A playthrough of your game, a timelapse of your build, a short film',
    accepts: 'MP4, WEBM, MOV, M4V',
  },
  {
    type: 'models',
    icon: '📦',
    name: '3D Models',
    description: 'Display interactive 3D models you can rotate in the browser.',
    example: 'A character model from Blender, a level asset, a prop you designed',
    accepts: 'GLB, GLTF, FBX, STL, OBJ, PLY, 3DS',
  },
  {
    type: 'games',
    icon: '🎮',
    name: 'Games',
    description: 'Embed a playable Godot HTML5 game export directly in your portfolio.',
    example: 'Your finished game, a prototype, a game jam entry',
    accepts: 'Godot HTML5 export folder (File → Export → Web in Godot)',
  },
  {
    type: 'code',
    icon: '💻',
    name: 'Code',
    description: 'Show syntax-highlighted code snippets with labels.',
    example: 'A GDScript function, a Python script, a shader you wrote',
  },
  {
    type: 'blueprints',
    icon: '⬡',
    name: 'Blueprints',
    description: 'Display Unreal Engine Blueprint node graphs — paste copy-text or upload a screenshot.',
    example: 'A character movement Blueprint, an interaction system',
    accepts: 'Paste: copy nodes in UE (Ctrl+C) · Screenshot: JPG, PNG, GIF, WEBP',
  },
  {
    type: 'custom',
    icon: '📝',
    name: 'Text',
    description: 'A freeform rich-text block — write anything.',
    example: 'A reflection on what you learned, a blog post, a short story',
  },
  {
    type: 'project',
    icon: '📋',
    name: 'Project',
    description: 'Document a whole project with a cover image, description, and screenshots.',
    example: '"My first Godot game — what I made, how I made it, what I\'d do differently"',
    accepts: 'JPG, PNG, GIF, WEBP, AVIF, HEIC, TIFF',
  },
  {
    type: 'links',
    icon: '🔗',
    name: 'Links',
    description: 'A row of labelled links to external sites.',
    example: 'Your itch.io page, GitHub, ArtStation',
  },
  {
    type: 'skills',
    icon: '⭐',
    name: 'Skills',
    description: 'Show skills as coloured badge tags.',
    example: 'Blender, GDScript, Pixel Art, Team Leadership',
  },
  {
    type: 'timeline',
    icon: '📅',
    name: 'Timeline',
    description: 'A vertical timeline of events or milestones.',
    example: '"Jan 2025 — finished first game", "Mar 2025 — joined Player Ready"',
  },
  {
    type: 'quote',
    icon: '❝',
    name: 'Quote',
    description: 'One or more pull-quotes with attribution.',
    example: 'A quote from a mentor, something that inspired you',
  },
  {
    type: 'embed',
    icon: '📡',
    name: 'Embed',
    description: 'Embed any website or tool via URL.',
    example: 'A Scratch project, a Google Slides presentation, a Figma file',
  },
  {
    type: 'content',
    icon: '🧩',
    name: 'Content',
    description: 'A flexible block editor — mix text, images, video, quotes, two-column layouts, and progress bars.',
    example: 'A project writeup with images and a skills progress bar',
    accepts: 'Images: JPG, PNG, GIF, WEBP, HEIC · Video: MP4, WEBM',
  },
  {
    type: 'stats',
    icon: '📊',
    name: 'Stats',
    description: 'Big number callouts for key achievements.',
    example: '"200 hours", "3 games shipped", "1st place"',
  },
  {
    type: 'buttons',
    icon: '🔘',
    name: 'Buttons',
    description: 'Call-to-action buttons linking to external pages.',
    example: '"Play my game", "View my GitHub", "Contact me"',
  },
]

interface Props {
  onClose: () => void
}

export function HelpModal({ onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640,
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', margin: '0 16px',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Section Guide</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 20px 16px' }}>
          {SECTION_HELP.map((entry, i) => (
            <div
              key={entry.type}
              style={{
                padding: '12px 0',
                borderBottom: i < SECTION_HELP.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                {entry.icon} {entry.name}
              </div>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 2 }}>
                {entry.description}
              </div>
              <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: entry.accepts ? 4 : 0 }}>
                e.g. {entry.example}
              </div>
              {entry.accepts && (
                <div style={{ fontSize: 11, color: '#6366f1' }}>
                  <strong>Accepts:</strong> {entry.accepts}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd portfolio-builder
npm run test:renderer -- --reporter=verbose --project renderer 2>&1 | grep -A3 "HelpModal"
```

Expected: all 9 HelpModal tests PASS.

- [ ] **Step 5: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/components/shared/HelpModal.tsx tests/renderer/HelpModal.test.tsx
git commit -m "feat: add HelpModal component with all 17 section entries"
```

---

## Task 2: Wire ? button into TopBar

**Files:**
- Modify: `portfolio-builder/src/renderer/src/components/editor/TopBar.tsx`

- [ ] **Step 1: Read the current TopBar**

The current `TopBar.tsx` renders:
- Left: `← Back` button, portfolio name, `<SaveStatus>`
- Right: `Save` button

It uses `useState` from React already.

- [ ] **Step 2: Update TopBar.tsx**

Replace the entire file content with:

```tsx
import { useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { NotifyFn } from '../shared/Toaster'
import { HelpModal } from '../shared/HelpModal'

interface Props {
  notify: NotifyFn
  autosaving: boolean
}

function SaveStatus({ dirty, autosaving, lastSaved }: { dirty: boolean; autosaving: boolean; lastSaved: Date | null }) {
  if (autosaving) {
    return <span style={{ fontSize: 11, color: '#94a3b8' }}>Auto-saving…</span>
  }
  if (dirty) {
    return <span style={{ fontSize: 11, color: '#e94560' }}>Unsaved changes</span>
  }
  if (lastSaved) {
    return <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Saved</span>
  }
  return null
}

export function TopBar({ notify, autosaving }: Props) {
  const { state, closePortfolio, savePortfolio } = usePortfolio()
  const [saving, setSaving] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await savePortfolio()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #e0e0e0',
        background: 'white',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={closePortfolio}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13 }}
          >
            ← Back
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{state.portfolio?.name}</span>
          <SaveStatus dirty={state.dirty} autosaving={autosaving} lastSaved={state.lastSaved} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="Section guide"
            title="Section guide"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid #d0d0d0', background: 'none',
              cursor: 'pointer', color: '#666', fontSize: 13,
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >?</button>
          <button
            onClick={handleSave}
            disabled={saving || autosaving}
            title="Save and create a version snapshot"
            style={{ padding: '6px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: saving || autosaving ? 'wait' : 'pointer', fontSize: 13, opacity: saving || autosaving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
cd portfolio-builder
npm run typecheck:web
```

Expected: exits 0.

- [ ] **Step 4: Run all tests**

```bash
cd portfolio-builder
npm run test:main
```

Expected: 77/77 passing (HelpModal tests in renderer, main tests unchanged).

- [ ] **Step 5: Manually verify in the app**

```bash
cd portfolio-builder
npm run dev
```

- Open a portfolio in the editor
- Confirm `?` circle button appears in the top-right of the toolbar between the save status and Save button
- Click `?` — modal opens showing "Section Guide" with all 17 sections scrollable
- Confirm sections show icon, bold name, description, italic example
- Confirm file-upload sections (e.g. Gallery, Videos, 3D Models) show an indigo "Accepts: …" line
- Confirm type-only sections (e.g. Links, Skills) do NOT show an Accepts line
- Close via `×` button — modal closes
- Close via clicking dark backdrop — modal closes
- Open again, press `Escape` — modal closes

- [ ] **Step 6: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/components/editor/TopBar.tsx
git commit -m "feat: add ? help button to TopBar wired to HelpModal"
```
