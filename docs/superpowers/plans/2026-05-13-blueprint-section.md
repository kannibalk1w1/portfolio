# Blueprint Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `blueprints` section type to Launchpad that lets CYPs paste UE Blueprint copy-text or upload a screenshot, with a React Flow interactive viewer in the editor and a vanilla-JS SVG viewer in the published site.

**Architecture:** Pure TypeScript parser (`parseUECopyText.ts`) shared between the editor and the site generator. The Electron editor uses `@xyflow/react` for an interactive node graph with a sliding inspect panel. The site generator pre-parses the UE text into JSON and embeds it in the HTML for a standalone `blueprint-viewer.js` IIFE (no React dependency, ~300 lines of vanilla JS + SVG).

**Tech Stack:** `@xyflow/react` v12, `dnd-kit` (already installed), `vitest` (already installed), vanilla JS/SVG for the published-site renderer.

---

## File Map

| Status | Path | Responsibility |
|---|---|---|
| Create | `src/renderer/src/lib/blueprint/parseUECopyText.ts` | Pure TS parser — UE copy-text → `ParsedBlueprint` |
| Create | `src/renderer/src/lib/blueprint/BlueprintViewer.tsx` | React Flow viewer component + inspect panel |
| Create | `src/renderer/src/components/sections/BlueprintsSection.tsx` | Editor section UI (tabs, reorder, labels) |
| Create | `src/main/generator/sections/blueprints.ts` | HTML generator for published site |
| Create | `src/renderer/public/vendor/blueprint-viewer.js` | Standalone IIFE for published-site interactivity |
| Create | `tests/main/blueprint/parseUECopyText.test.ts` | Unit tests for the parser |
| Modify | `src/renderer/src/types/portfolio.ts` | Add `BlueprintItem`, `BlueprintsSection`, update unions |
| Modify | `src/renderer/src/pages/Editor.tsx` | Add `blueprints` to `SECTION_COMPONENTS` |
| Modify | `src/renderer/src/components/editor/Sidebar.tsx` | Add `blueprints` to defaults + labels |
| Modify | `src/main/generator/index.ts` | Import `renderBlueprints`, add to switch |
| Modify | `src/main/generator/template.ts` | Add CSS, `needsBlueprints`, script injection, page icon |

---

## Task 1: Add types and install @xyflow/react

**Files:**
- Modify: `src/renderer/src/types/portfolio.ts`
- Run: `npm install @xyflow/react` in `portfolio-builder/`

- [ ] **Step 1: Install the package**

```bash
cd portfolio-builder
npm install @xyflow/react
```

Expected: package added to `node_modules/@xyflow/react`, version recorded in `package.json`.

- [ ] **Step 2: Add types to portfolio.ts**

Open `src/renderer/src/types/portfolio.ts`.

Replace the first line (`export type SectionType = ...`) with:

```typescript
export type SectionType = 'about' | 'gallery' | 'videos' | 'models' | 'games' | 'code' | 'custom' | 'project' | 'links' | 'skills' | 'timeline' | 'quote' | 'embed' | 'content' | 'stats' | 'buttons' | 'blueprints'
```

After the `ButtonsSection` interface block (around line 216), add before the `// Section union` comment:

```typescript
// ---------------------------------------------------------------------------
// Blueprints section
// ---------------------------------------------------------------------------

export interface BlueprintItem {
  id: string
  kind: 'paste' | 'image'
  content: string  // raw UE copy-text for 'paste'; filename in assets/ for 'image'
  label?: string
}

export interface BlueprintsSection extends BaseSection {
  type: 'blueprints'
  description?: string
  items: BlueprintItem[]
}
```

Add `BlueprintsSection` to the `Section` union at the bottom of that block:

```typescript
export type Section =
  | AboutSection
  | GallerySection
  | VideosSection
  | ModelsSection
  | GamesSection
  | CodeSection
  | CustomSection
  | ProjectSection
  | LinksSection
  | SkillsSection
  | TimelineSection
  | QuoteSection
  | EmbedSection
  | ContentSection
  | StatsSection
  | ButtonsSection
  | BlueprintsSection
```

- [ ] **Step 3: Verify types compile**

```bash
cd portfolio-builder
npm run typecheck
```

Expected: exits 0 (no errors).

- [ ] **Step 4: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/types/portfolio.ts package.json package-lock.json
git commit -m "feat: add BlueprintsSection types and install @xyflow/react"
```

---

## Task 2: UE copy-text parser

**Files:**
- Create: `portfolio-builder/src/renderer/src/lib/blueprint/parseUECopyText.ts`
- Create: `portfolio-builder/tests/main/blueprint/parseUECopyText.test.ts`

- [ ] **Step 1: Write the failing test**

Create `portfolio-builder/tests/main/blueprint/parseUECopyText.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseUECopyText } from '../../../src/renderer/src/lib/blueprint/parseUECopyText'

const SAMPLE = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000002A,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",LinkedTo=())
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000003A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_0 AABBCCDD00000000000000000000005A,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent=Class'"/Script/Engine.KismetSystemLibrary"',MemberName="PrintString")
   NodePosX=368
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000004A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000005A,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_0 AABBCCDD00000000000000000000003A,))
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000006A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=())
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000007A,PinName="InString",Direction="EGPD_Input",PinType.PinCategory="string",LinkedTo=())
End Object`

describe('parseUECopyText', () => {
  it('returns null for text with no Begin Object blocks', () => {
    expect(parseUECopyText('hello world')).toBeNull()
    expect(parseUECopyText('')).toBeNull()
  })

  it('parses node count correctly', () => {
    const result = parseUECopyText(SAMPLE)
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(2)
  })

  it('extracts node positions', () => {
    const result = parseUECopyText(SAMPLE)!
    const event = result.nodes.find(n => n.className.includes('K2Node_Event'))!
    expect(event.posX).toBe(0)
    expect(event.posY).toBe(0)
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(fn.posX).toBe(368)
  })

  it('sets displayName from class name', () => {
    const result = parseUECopyText(SAMPLE)!
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(fn.displayName).toBe('Call Function')
  })

  it('parses pins with direction and type', () => {
    const result = parseUECopyText(SAMPLE)!
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    const execIn = fn.pins.find(p => p.name === 'execute')!
    expect(execIn.direction).toBe('input')
    expect(execIn.type).toBe('exec')
    const strIn = fn.pins.find(p => p.name === 'InString')!
    expect(strIn.type).toBe('string')
  })

  it('builds edges from output pin LinkedTo references', () => {
    const result = parseUECopyText(SAMPLE)!
    expect(result.edges).toHaveLength(1)
    const edge = result.edges[0]
    const eventNode = result.nodes.find(n => n.className.includes('K2Node_Event'))!
    const fnNode = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(edge.sourceNodeId).toBe(eventNode.id)
    expect(edge.targetNodeId).toBe(fnNode.id)
  })

  it('uses NodeGuid as node id', () => {
    const result = parseUECopyText(SAMPLE)!
    expect(result.nodes[0].id).toBe('AABBCCDD00000000000000000000001A')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd portfolio-builder
npm run test:main -- --reporter=verbose 2>&1 | head -30
```

Expected: FAIL — `Cannot find module '../../../src/renderer/src/lib/blueprint/parseUECopyText'`

- [ ] **Step 3: Implement the parser**

Create `portfolio-builder/src/renderer/src/lib/blueprint/parseUECopyText.ts`:

```typescript
export interface ParsedPin {
  id: string
  name: string
  direction: 'input' | 'output'
  type: string
}

export interface ParsedNode {
  id: string
  className: string
  displayName: string
  posX: number
  posY: number
  comment: string
  pins: ParsedPin[]
}

export interface ParsedEdge {
  id: string
  sourceNodeId: string
  sourcePinId: string
  targetNodeId: string
  targetPinId: string
}

export interface ParsedBlueprint {
  nodes: ParsedNode[]
  edges: ParsedEdge[]
}

function toDisplayName(className: string): string {
  const short = className.split('.').pop() ?? className
  const stripped = short.replace(/^K2Node_/, '')
  return stripped.replace(/([A-Z])/g, ' $1').trim()
}

function parsePin(line: string): ParsedPin | null {
  const idMatch = line.match(/PinId=([0-9A-Fa-f]+)/)
  const nameMatch = line.match(/PinName="([^"]*)"/)
  const dirMatch = line.match(/Direction="(EGPD_Input|EGPD_Output)"/)
  const typeMatch = line.match(/PinType\.PinCategory="([^"]*)"/)
  if (!idMatch || !nameMatch) return null
  return {
    id: idMatch[1],
    name: nameMatch[1],
    direction: dirMatch?.[1] === 'EGPD_Output' ? 'output' : 'input',
    type: typeMatch?.[1] ?? 'unknown',
  }
}

export function parseUECopyText(text: string): ParsedBlueprint | null {
  const blockRe = /Begin Object[^\n]*\n([\s\S]*?)End Object/g
  const blocks = [...text.matchAll(blockRe)]
  if (blocks.length === 0) return null

  // First pass: collect name → guid mapping for edge resolution
  const nameToGuid = new Map<string, string>()
  for (const block of blocks) {
    const nameMatch = block[0].match(/Name="([^"]+)"/)
    const guidMatch = block[1].match(/NodeGuid=([0-9A-Fa-f]+)/)
    if (nameMatch && guidMatch) nameToGuid.set(nameMatch[1], guidMatch[1])
  }

  const nodes: ParsedNode[] = []
  const edges: ParsedEdge[] = []
  const seenEdgeIds = new Set<string>()

  for (const block of blocks) {
    const full = block[0]
    const body = block[1]

    const classMatch = full.match(/Class=([^\s]+)/)
    const nameMatch = full.match(/Name="([^"]+)"/)
    const guidMatch = body.match(/NodeGuid=([0-9A-Fa-f]+)/)
    const posXMatch = body.match(/NodePosX=(-?\d+)/)
    const posYMatch = body.match(/NodePosY=(-?\d+)/)
    const commentMatch = body.match(/NodeComment="([^"]*)"/)

    if (!guidMatch) continue

    const className = classMatch?.[1] ?? ''
    const id = guidMatch[1]

    const pins: ParsedPin[] = []
    const pinLines = body.match(/CustomProperties Pin \([^)]+\)/g) ?? []
    for (const line of pinLines) {
      const pin = parsePin(line)
      if (pin) pins.push(pin)
    }

    // Build edges from output pins' LinkedTo references
    for (const line of pinLines) {
      const dirMatch = line.match(/Direction="(EGPD_Output)"/)
      if (!dirMatch) continue
      const pinIdMatch = line.match(/PinId=([0-9A-Fa-f]+)/)
      const linkedMatch = line.match(/LinkedTo=\(([^)]+)\)/)
      if (!pinIdMatch || !linkedMatch) continue
      const linkedStr = linkedMatch[1].trim()
      if (!linkedStr) continue
      // Format: "ObjectName PinId," (may be multiple, comma-separated)
      for (const ref of linkedStr.split(',')) {
        const parts = ref.trim().split(/\s+/)
        if (parts.length < 2) continue
        const targetName = parts[0]
        const targetPinId = parts[1]
        const targetNodeId = nameToGuid.get(targetName)
        if (!targetNodeId) continue
        const edgeId = `${id}_${pinIdMatch[1]}_${targetNodeId}_${targetPinId}`
        if (seenEdgeIds.has(edgeId)) continue
        seenEdgeIds.add(edgeId)
        edges.push({ id: edgeId, sourceNodeId: id, sourcePinId: pinIdMatch[1], targetNodeId, targetPinId })
      }
    }

    nodes.push({
      id,
      className,
      displayName: toDisplayName(className),
      posX: posXMatch ? parseInt(posXMatch[1], 10) : 0,
      posY: posYMatch ? parseInt(posYMatch[1], 10) : 0,
      comment: commentMatch?.[1] ?? '',
      pins,
    })
  }

  return { nodes, edges }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd portfolio-builder
npm run test:main -- --reporter=verbose 2>&1 | head -40
```

Expected: all 7 parser tests PASS.

- [ ] **Step 5: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/lib/blueprint/parseUECopyText.ts tests/main/blueprint/parseUECopyText.test.ts
git commit -m "feat: add UE blueprint copy-text parser with tests"
```

---

## Task 3: BlueprintViewer React component

**Files:**
- Create: `src/renderer/src/lib/blueprint/BlueprintViewer.tsx`

- [ ] **Step 1: Create the component**

Create `portfolio-builder/src/renderer/src/lib/blueprint/BlueprintViewer.tsx`:

```tsx
import { useCallback, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position,
  type NodeProps, type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { parseUECopyText, type ParsedBlueprint, type ParsedPin } from './parseUECopyText'

function nodeColor(className: string): string {
  if (className.includes('K2Node_Event')) return '#c0392b'
  if (className.includes('K2Node_CallFunction')) return '#2980b9'
  if (/K2Node_Variable(Get|Set)/.test(className)) return '#27ae60'
  if (/K2Node_(IfThenElse|ExecutionSequence|Select)/.test(className)) return '#8e44ad'
  return '#555555'
}

function pinColor(type: string): string {
  if (type === 'exec') return '#ffffff'
  if (type === 'string' || type === 'name') return '#f39c12'
  if (type === 'float' || type === 'int' || type === 'byte') return '#2ecc71'
  if (type === 'bool') return '#e74c3c'
  return '#95a5a6'
}

function PinRow({ pin, side }: { pin: ParsedPin; side: 'left' | 'right' }) {
  const color = pinColor(pin.type)
  const isExec = pin.type === 'exec'
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '2px 0', justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
      <Handle
        type={side === 'left' ? 'target' : 'source'}
        id={pin.id}
        position={side === 'left' ? Position.Left : Position.Right}
        style={{ background: color, width: 8, height: 8, border: 'none', top: '50%', transform: 'translateY(-50%)', [side === 'left' ? 'left' : 'right']: -4 }}
      />
      <span style={{ fontSize: 11, color, userSelect: 'none', padding: '0 10px' }}>
        {isExec ? '▶' : '●'} {pin.name}
      </span>
    </div>
  )
}

type UENodeData = {
  className: string
  displayName: string
  comment: string
  pins: ParsedPin[]
  onSelect: (id: string) => void
}

function UENode({ id, data }: NodeProps<Node<UENodeData>>) {
  const inputPins = data.pins.filter(p => p.direction === 'input')
  const outputPins = data.pins.filter(p => p.direction === 'output')
  const color = nodeColor(data.className)
  return (
    <div
      onClick={() => data.onSelect(id)}
      style={{ minWidth: 160, background: '#1e1e2e', border: `2px solid ${color}`, borderRadius: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ background: color, padding: '4px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
        {data.displayName}
      </div>
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>{inputPins.map(p => <PinRow key={p.id} pin={p} side="left" />)}</div>
          <div>{outputPins.map(p => <PinRow key={p.id} pin={p} side="right" />)}</div>
        </div>
      </div>
    </div>
  )
}

const NODE_TYPES = { ueNode: UENode }

function blueprintToFlow(bp: ParsedBlueprint, onSelect: (id: string) => void): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: bp.nodes.map(n => ({
      id: n.id,
      type: 'ueNode',
      position: { x: n.posX, y: n.posY },
      data: { className: n.className, displayName: n.displayName, comment: n.comment, pins: n.pins, onSelect },
    })),
    edges: bp.edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      sourceHandle: e.sourcePinId,
      target: e.targetNodeId,
      targetHandle: e.targetPinId,
      type: 'smoothstep',
      style: { stroke: '#ffffff', strokeWidth: 1.5 },
    })),
  }
}

interface Props {
  ueText: string
  height?: number
}

export function BlueprintViewer({ ueText, height = 320 }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const parsed = parseUECopyText(ueText)

  const { nodes: initNodes, edges: initEdges } = parsed
    ? blueprintToFlow(parsed, setSelectedId)
    : { nodes: [], edges: [] }

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  const selectedNode = parsed?.nodes.find(n => n.id === selectedId) ?? null

  const onPaneClick = useCallback(() => setSelectedId(null), [])

  if (!parsed) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', borderRadius: 8, color: '#e74c3c', fontSize: 13 }}>
        Couldn't read this blueprint. Try copying again from the UE editor, or use a screenshot instead.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
          fitView
          style={{ background: '#1a1a2e' }}
        >
          <Background color="#2a2a4e" gap={20} />
          <Controls />
          <MiniMap nodeColor={n => nodeColor((n.data as UENodeData).className)} style={{ background: '#111' }} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div style={{ width: 200, background: '#22223a', borderLeft: '2px solid #7eceff', padding: 12, overflowY: 'auto', fontSize: 12 }}>
          <div style={{ color: '#7eceff', fontWeight: 700, marginBottom: 6 }}>{selectedNode.displayName}</div>
          <div style={{ color: '#888', marginBottom: 8, fontSize: 10 }}>{selectedNode.className.split('.').pop()}</div>
          {selectedNode.comment && (
            <div style={{ color: '#aaa', marginBottom: 8, fontStyle: 'italic' }}>{selectedNode.comment}</div>
          )}
          <div style={{ color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10, marginBottom: 4 }}>Pins</div>
          {selectedNode.pins.map(p => (
            <div key={p.id} style={{ color: pinColor(p.type), marginBottom: 2 }}>
              {p.type === 'exec' ? '▶' : '●'} {p.name}
            </div>
          ))}
          <button
            onClick={() => setSelectedId(null)}
            style={{ marginTop: 12, width: '100%', background: 'none', border: '1px solid #444', borderRadius: 4, color: '#888', fontSize: 11, padding: '4px 0', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd portfolio-builder
npm run typecheck:web
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/lib/blueprint/BlueprintViewer.tsx
git commit -m "feat: add BlueprintViewer React Flow component"
```

---

## Task 4: BlueprintsSection editor component

**Files:**
- Create: `src/renderer/src/components/sections/BlueprintsSection.tsx`

- [ ] **Step 1: Create the component**

Create `portfolio-builder/src/renderer/src/components/sections/BlueprintsSection.tsx`:

```tsx
import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePortfolio } from '../../store/PortfolioContext'
import type { BlueprintsSection as BlueprintsSectionType, BlueprintItem, Section } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { SectionTitle } from '../shared/SectionTitle'
import { RichTextEditor } from '../shared/RichTextEditor'
import { useImageInserter } from '../../hooks/useImageInserter'
import { BlueprintViewer } from '../../lib/blueprint/BlueprintViewer'
import { parseUECopyText } from '../../lib/blueprint/parseUECopyText'
import { toFileUrl } from '../../utils/fileUrl'

function SortableBlueprintItem({
  item,
  portfolioDir,
  onRemove,
  onLabelChange,
}: {
  item: BlueprintItem
  portfolioDir: string
  onRemove: () => void
  onLabelChange: (label: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}
    >
      {item.kind === 'paste' ? (
        <BlueprintViewer ueText={item.content} height={280} />
      ) : (
        <img
          src={toFileUrl(`${portfolioDir}/assets/${item.content}`)}
          alt={item.label ?? item.content}
          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: '#1a1a2e', display: 'block' }}
        />
      )}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc', fontSize: 18, flexShrink: 0, lineHeight: 1 }}
          title="Drag to reorder"
        >⠿</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
            {item.kind === 'paste' ? 'Blueprint paste' : item.content}
          </div>
          <input
            onPointerDown={e => e.stopPropagation()}
            value={item.label ?? ''}
            onChange={e => onLabelChange(e.target.value)}
            placeholder="Label (optional)"
            style={{ width: '100%', padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
          aria-label="Remove"
        >×</button>
      </div>
    </div>
  )
}

export function BlueprintsSection({ section }: { section: BlueprintsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()
  const [tab, setTab] = useState<'paste' | 'image'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function updateSection(patch: Partial<BlueprintsSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  function addPaste() {
    setPasteError(null)
    if (!parseUECopyText(pasteText)) {
      setPasteError("Couldn't read this blueprint. Try copying again from the UE editor, or use a screenshot instead.")
      return
    }
    const item: BlueprintItem = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'paste',
      content: pasteText,
    }
    updateSection({ items: [...section.items, item] })
    setPasteText('')
  }

  async function handleImageImport(paths: string[]) {
    setImportError(null)
    try {
      const filenames = await window.api.importMedia(state.portfolioDir!, paths)
      const newItems: BlueprintItem[] = filenames.map(filename => ({
        id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'image' as const,
        content: filename,
      }))
      updateSection({ items: [...section.items, ...newItems] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? '#333' : '#999',
    background: active ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    cursor: 'pointer',
  })

  return (
    <div>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Description</span>
        <RichTextEditor
          key={section.id}
          content={section.description ?? ''}
          onChange={description => updateSection({ description })}
          minHeight={80}
          placeholder="Add a description…"
          onInsertImage={onInsertImage}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = section.items.findIndex(i => i.id === active.id)
        const newIndex = section.items.findIndex(i => i.id === over.id)
        updateSection({ items: arrayMove(section.items, oldIndex, newIndex) })
      }}>
        <SortableContext items={section.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {section.items.map(item => (
              <SortableBlueprintItem
                key={item.id}
                item={item}
                portfolioDir={state.portfolioDir!}
                onRemove={() => updateSection({ items: section.items.filter(i => i.id !== item.id) })}
                onLabelChange={label => updateSection({ items: section.items.map(i => i.id === item.id ? { ...i, label } : i) })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add panel */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <button style={tabStyle(tab === 'paste')} onClick={() => setTab('paste')}>Paste text</button>
          <button style={tabStyle(tab === 'image')} onClick={() => setTab('image')}>Screenshot</button>
        </div>

        {tab === 'paste' ? (
          <div style={{ padding: 12 }}>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError(null) }}
              placeholder={'Copy nodes in UE editor (Ctrl+C), then paste here…\n\nBegin Object Class=…'}
              style={{ width: '100%', height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 11, padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: 4, boxSizing: 'border-box' }}
            />
            {pasteError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 6 }}>{pasteError}</div>}
            <button
              onClick={addPaste}
              disabled={!pasteText.trim()}
              style={{ width: '100%', padding: '8px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: pasteText.trim() ? 'pointer' : 'not-allowed', opacity: pasteText.trim() ? 1 : 0.5 }}
            >
              Add blueprint
            </button>
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            {importError && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 8 }}>{importError}</div>}
            <MediaDropzone
              label="Click to add screenshot (PNG, JPG, GIF, WEBP)"
              filters={[{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]}
              onFiles={handleImageImport}
            />
          </div>
        )}
      </div>

      {section.items.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic', marginTop: 12, textAlign: 'center' }}>
          No blueprints added yet.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd portfolio-builder
npm run typecheck:web
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/components/sections/BlueprintsSection.tsx
git commit -m "feat: add BlueprintsSection editor component"
```

---

## Task 5: Wire blueprints into Editor and Sidebar

**Files:**
- Modify: `src/renderer/src/pages/Editor.tsx`
- Modify: `src/renderer/src/components/editor/Sidebar.tsx`

- [ ] **Step 1: Add to Editor.tsx SECTION_COMPONENTS**

In `src/renderer/src/pages/Editor.tsx`, add one entry to the `SECTION_COMPONENTS` record (after the `buttons` line):

```typescript
  buttons:    lazy(() => import('../components/sections/ButtonsSection').then(m => ({ default: m.ButtonsSection }))),
  blueprints: lazy(() => import('../components/sections/BlueprintsSection').then(m => ({ default: m.BlueprintsSection }))),
```

- [ ] **Step 2: Add to Sidebar.tsx**

In `src/renderer/src/components/editor/Sidebar.tsx`:

1. Add `BlueprintsSection` to the import from `../../types/portfolio`:
```typescript
import type { Section, SectionType, AboutSection, GallerySection, VideosSection, ModelsSection, GamesSection, CodeSection, CustomSection, ProjectSection, LinksSection, SkillsSection, TimelineSection, QuoteSection, EmbedSection, ContentSection, StatsSection, ButtonsSection, BlueprintsSection } from '../../types/portfolio'
```

2. Add the type annotation for blueprints in `SECTION_DEFAULTS`:
```typescript
const SECTION_DEFAULTS: {
  // ... existing entries ...
  buttons: Omit<ButtonsSection, 'id'>
  blueprints: Omit<BlueprintsSection, 'id'>
} = {
```

3. Add the default value at the end of the `SECTION_DEFAULTS` object:
```typescript
  buttons:    { type: 'buttons',    title: 'Buttons',    visible: true, items: [] },
  blueprints: { type: 'blueprints', title: 'Blueprints', visible: true, items: [] },
```

4. Add to `SECTION_LABELS`:
```typescript
  buttons: '🔘 Buttons',
  blueprints: '⬡ Blueprints',
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd portfolio-builder
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Run the app and manually test**

```bash
cd portfolio-builder
npm run dev
```

- Open the app, create or open a portfolio
- Click "Add section" in the sidebar
- Confirm "⬡ Blueprints" appears in the section type picker
- Add the section, paste a snippet starting with `Begin Object`, click "Add blueprint"
- Confirm the React Flow graph renders with dark background and coloured nodes
- Commit after confirming.

- [ ] **Step 5: Commit**

```bash
cd portfolio-builder
git add src/renderer/src/pages/Editor.tsx src/renderer/src/components/editor/Sidebar.tsx
git commit -m "feat: wire blueprints section into Editor and Sidebar"
```

---

## Task 6: Generator — renderBlueprints

**Files:**
- Create: `src/main/generator/sections/blueprints.ts`

- [ ] **Step 1: Create the generator**

Create `portfolio-builder/src/main/generator/sections/blueprints.ts`:

```typescript
import type { BlueprintsSection } from '../../../renderer/src/types/portfolio'
import { escHtml, escSrc } from '../utils'
import { renderDescription } from '../sanitize'
import { parseUECopyText } from '../../../renderer/src/lib/blueprint/parseUECopyText'

export function renderBlueprints(section: BlueprintsSection): string {
  const items = section.items.map(item => {
    if (item.kind === 'image') {
      return `
    <div class="bp-item">
      <img
        src="assets/${escSrc(item.content)}"
        class="lb-trigger bp-img"
        data-src="assets/${escSrc(item.content)}"
        alt="${escHtml(item.label ?? item.content)}"
        decoding="async">
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
    }

    const parsed = parseUECopyText(item.content)
    if (!parsed) {
      return `
    <div class="bp-item">
      <div class="bp-parse-error">Blueprint data could not be read.</div>
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
    }

    const jsonData = JSON.stringify(parsed).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    return `
    <div class="bp-item">
      <script type="application/json" id="bp-data-${escHtml(item.id)}">${jsonData}</script>
      <div class="bp-canvas" data-id="${escHtml(item.id)}" style="width:100%;height:400px;"></div>
      ${item.label ? `<p class="bp-label">${escHtml(item.label)}</p>` : ''}
    </div>`
  }).join('')

  return `
<section id="${escHtml(section.id)}" class="section">
  <h2 class="section-title">${escHtml(section.title)}</h2>
  ${renderDescription(section.description)}
  <div class="blueprints-list">${items || '<p class="empty">No blueprints yet.</p>'}</div>
</section>`
}
```

- [ ] **Step 2: Verify no TypeScript errors in main**

```bash
cd portfolio-builder
npm run typecheck:node
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd portfolio-builder
git add src/main/generator/sections/blueprints.ts
git commit -m "feat: add blueprint section HTML generator"
```

---

## Task 7: Generator index + template wiring

**Files:**
- Modify: `src/main/generator/index.ts`
- Modify: `src/main/generator/template.ts`

- [ ] **Step 1: Add renderBlueprints to index.ts**

In `src/main/generator/index.ts`:

1. Add the import after the `renderButtons` import line:
```typescript
import { renderButtons } from './sections/buttons'
import { renderBlueprints } from './sections/blueprints'
```

2. Add a case in the `renderSection` switch (after `case 'buttons'`):
```typescript
    case 'buttons':     return renderButtons(section)
    case 'blueprints':  return renderBlueprints(section)
```

- [ ] **Step 2: Add needsBlueprints helper to template.ts**

In `src/main/generator/template.ts`, add this function after `needsLightbox`:

```typescript
function needsBlueprints(sections: Section[]): boolean {
  return sections.some(s =>
    s.type === 'blueprints' && s.visible &&
    (s as any).items?.some((i: any) => i.kind === 'paste')
  )
}
```

- [ ] **Step 3: Add blueprint-viewer.js script to wrapTemplate**

In `wrapTemplate`, add this block after the `highlightLinks` block (around line 145):

```typescript
  const blueprintScript = needsBlueprints(portfolio.sections)
    ? `  <script src="assets/vendor/blueprint-viewer.js"></script>`
    : ''
```

Then inject `blueprintScript` into the returned HTML string after `${highlightLinks}`:

```typescript
  ${highlightLinks}
  ${blueprintScript}
```

- [ ] **Step 4: Add blueprint CSS to wrapTemplate**

Inside the `<style>` block in `wrapTemplate`, add after the `/* ── Empty state ── */` rule:

```css
    /* ── Blueprints ── */
    .blueprints-list { display: flex; flex-direction: column; gap: 20px; }
    .bp-item { display: flex; flex-direction: column; gap: 6px; }
    .bp-canvas { border-radius: 8px; overflow: hidden; background: #1a1a2e; }
    .bp-img { width: 100%; border-radius: 8px; cursor: zoom-in; transition: opacity .2s; }
    .bp-img:hover { opacity: .9; }
    .bp-label { font-size: 13px; color: var(--muted); text-align: center; }
    .bp-parse-error { padding: 16px; background: #1a1a2e; color: #e74c3c; font-size: 13px; border-radius: 8px; text-align: center; }
```

- [ ] **Step 5: Add blueprint to PAGE_ICONS in template.ts**

In the `PAGE_ICONS` object:
```typescript
const PAGE_ICONS: Record<string, string> = {
  about: '👤', gallery: '🖼', videos: '🎬', models: '📦', games: '🎮',
  code: '💻', custom: '📝', project: '📋', links: '🔗', skills: '⭐',
  timeline: '📅', quote: '❝', embed: '📡', content: '🧩', stats: '📊', buttons: '🔘',
  blueprints: '⬡',
}
```

- [ ] **Step 6: Mirror blueprint-viewer.js script in wrapSubPage**

In `wrapSubPage`, add the same conditional script tag (after the `highlightLinks` variable assignment):

```typescript
  const blueprintSubScript = section.type === 'blueprints' && (section as any).items?.some((i: any) => i.kind === 'paste')
    ? `  <script src="assets/vendor/blueprint-viewer.js"></script>`
    : ''
```

And inject it in the returned HTML after `${highlightLinks}`:
```typescript
  ${highlightLinks}
  ${blueprintSubScript}
```

Also add the blueprint CSS in `wrapSubPage`'s `<style>` block (after the last rule, before `@media`):
```css
    .blueprints-list { display: flex; flex-direction: column; gap: 20px; }
    .bp-item { display: flex; flex-direction: column; gap: 6px; }
    .bp-canvas { border-radius: 8px; overflow: hidden; background: #1a1a2e; }
    .bp-img { width: 100%; border-radius: 8px; cursor: zoom-in; transition: opacity .2s; }
    .bp-img:hover { opacity: .9; }
    .bp-label { font-size: 13px; color: var(--muted); text-align: center; }
    .bp-parse-error { padding: 16px; background: #1a1a2e; color: #e74c3c; font-size: 13px; border-radius: 8px; text-align: center; }
```

- [ ] **Step 7: Update needsLightbox to include blueprint image items**

In `src/main/generator/template.ts`, update `needsLightbox` so screenshot items in a blueprints section trigger the lightbox:

```typescript
function needsLightbox(sections: Section[]): boolean {
  return sections.some(s => {
    if (!s.visible) return false
    if (s.type === 'gallery' || s.type === 'project') return (s as any).items?.length > 0 || (s as any).coverImageFilename
    if (s.type === 'blueprints') return (s as any).items?.some((i: any) => i.kind === 'image')
    return false
  })
}
```

Also update the inline lightbox condition in `wrapSubPage` (the `const needsLightbox = ...` line):

```typescript
  const needsLightbox = (
    (section.type === 'gallery' || section.type === 'project') &&
    ((section as any).items?.length > 0 || (section as any).coverImageFilename)
  ) || (
    section.type === 'blueprints' &&
    (section as any).items?.some((i: any) => i.kind === 'image')
  )
```

- [ ] **Step 8: Verify no TypeScript errors**

```bash
cd portfolio-builder
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
cd portfolio-builder
git add src/main/generator/index.ts src/main/generator/template.ts
git commit -m "feat: wire blueprint renderer into site generator and template"
```

---

## Task 8: Standalone blueprint-viewer.js

**Files:**
- Create: `src/renderer/public/vendor/blueprint-viewer.js`

- [ ] **Step 1: Create the standalone IIFE viewer**

Create `portfolio-builder/src/renderer/public/vendor/blueprint-viewer.js`:

```javascript
/* Blueprint viewer for Launchpad published portfolios.
   Reads pre-parsed blueprint JSON from <script type="application/json"> tags
   and renders an interactive SVG node graph into .bp-canvas elements. */
;(function () {
  'use strict'

  var NODE_W = 170
  var HEADER_H = 24
  var PIN_H = 18
  var PIN_PAD = 4

  var CLASS_COLORS = [
    ['K2Node_Event',        '#c0392b'],
    ['K2Node_CallFunction', '#2980b9'],
    ['K2Node_VariableGet',  '#27ae60'],
    ['K2Node_VariableSet',  '#27ae60'],
    ['K2Node_IfThenElse',   '#8e44ad'],
    ['K2Node_ExecutionSequence', '#8e44ad'],
    ['K2Node_Select',       '#8e44ad'],
  ]
  var DEFAULT_COLOR = '#555555'

  var PIN_TYPE_COLORS = {
    exec: '#ffffff',
    string: '#f39c12',
    name: '#f39c12',
    'float': '#2ecc71',
    'int': '#2ecc71',
    byte: '#2ecc71',
    bool: '#e74c3c',
  }

  function getNodeColor(className) {
    for (var i = 0; i < CLASS_COLORS.length; i++) {
      if (className.indexOf(CLASS_COLORS[i][0]) !== -1) return CLASS_COLORS[i][1]
    }
    return DEFAULT_COLOR
  }

  function getPinColor(type) {
    return PIN_TYPE_COLORS[type] || '#95a5a6'
  }

  function nodeHeight(node) {
    return HEADER_H + PIN_PAD * 2 + Math.max(
      node.pins.filter(function (p) { return p.direction === 'input' }).length,
      node.pins.filter(function (p) { return p.direction === 'output' }).length
    ) * PIN_H
  }

  function pinY(node, pin) {
    var sameSide = node.pins.filter(function (p) { return p.direction === pin.direction })
    var idx = sameSide.indexOf(pin)
    return HEADER_H + PIN_PAD + idx * PIN_H + PIN_H / 2
  }

  function ns(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag)
  }

  function svgText(content, x, y, opts) {
    var t = ns('text')
    t.setAttribute('x', x)
    t.setAttribute('y', y)
    t.setAttribute('font-size', opts.size || 10)
    t.setAttribute('fill', opts.fill || '#fff')
    t.setAttribute('dominant-baseline', 'middle')
    if (opts.anchor) t.setAttribute('text-anchor', opts.anchor)
    if (opts.weight) t.setAttribute('font-weight', opts.weight)
    t.textContent = content
    return t
  }

  function renderNode(node) {
    var g = ns('g')
    g.setAttribute('transform', 'translate(' + node.posX + ',' + node.posY + ')')
    g.dataset.nodeId = node.id
    g.style.cursor = 'pointer'

    var h = nodeHeight(node)
    var color = getNodeColor(node.className)

    // Card background
    var bg = ns('rect')
    bg.setAttribute('width', NODE_W)
    bg.setAttribute('height', h)
    bg.setAttribute('rx', 5)
    bg.setAttribute('fill', '#1e1e2e')
    bg.setAttribute('stroke', color)
    bg.setAttribute('stroke-width', 2)
    g.appendChild(bg)

    // Header
    var hdr = ns('rect')
    hdr.setAttribute('width', NODE_W)
    hdr.setAttribute('height', HEADER_H)
    hdr.setAttribute('rx', 5)
    hdr.setAttribute('fill', color)
    g.appendChild(hdr)

    // Clip the bottom round corners of header
    var hdrSquare = ns('rect')
    hdrSquare.setAttribute('y', HEADER_H - 5)
    hdrSquare.setAttribute('width', NODE_W)
    hdrSquare.setAttribute('height', 5)
    hdrSquare.setAttribute('fill', color)
    g.appendChild(hdrSquare)

    g.appendChild(svgText(node.displayName, NODE_W / 2, HEADER_H / 2, { size: 11, fill: '#fff', anchor: 'middle', weight: 'bold' }))

    // Pins
    var inputPins = node.pins.filter(function (p) { return p.direction === 'input' })
    var outputPins = node.pins.filter(function (p) { return p.direction === 'output' })

    inputPins.forEach(function (pin) {
      var py = pinY(node, pin)
      var pc = getPinColor(pin.type)
      var dot = ns('circle')
      dot.setAttribute('cx', 0)
      dot.setAttribute('cy', py)
      dot.setAttribute('r', 5)
      dot.setAttribute('fill', pc)
      dot.setAttribute('stroke', '#1e1e2e')
      dot.setAttribute('stroke-width', 1)
      g.appendChild(dot)
      g.appendChild(svgText((pin.type === 'exec' ? '▶ ' : '● ') + pin.name, 10, py, { size: 10, fill: pc }))
    })

    outputPins.forEach(function (pin) {
      var py = pinY(node, pin)
      var pc = getPinColor(pin.type)
      var dot = ns('circle')
      dot.setAttribute('cx', NODE_W)
      dot.setAttribute('cy', py)
      dot.setAttribute('r', 5)
      dot.setAttribute('fill', pc)
      dot.setAttribute('stroke', '#1e1e2e')
      dot.setAttribute('stroke-width', 1)
      g.appendChild(dot)
      g.appendChild(svgText(pin.name + (pin.type === 'exec' ? ' ▶' : ' ●'), NODE_W - 10, py, { size: 10, fill: pc, anchor: 'end' }))
    })

    return g
  }

  function findPinPos(nodesMap, nodeId, pinId, side) {
    var node = nodesMap[nodeId]
    if (!node) return null
    var pin = node.pins.find(function (p) { return p.id === pinId })
    if (!pin) return null
    var py = pinY(node, pin)
    return { x: node.posX + (side === 'source' ? NODE_W : 0), y: node.posY + py }
  }

  function renderEdge(edge, nodesMap) {
    var src = findPinPos(nodesMap, edge.sourceNodeId, edge.sourcePinId, 'source')
    var tgt = findPinPos(nodesMap, edge.targetNodeId, edge.targetPinId, 'target')
    if (!src || !tgt) return null
    var cx = (src.x + tgt.x) / 2
    var path = ns('path')
    var d = 'M' + src.x + ',' + src.y +
            ' C' + cx + ',' + src.y + ' ' + cx + ',' + tgt.y +
            ' ' + tgt.x + ',' + tgt.y
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#ffffff')
    path.setAttribute('stroke-width', 1.5)
    path.setAttribute('opacity', 0.7)
    return path
  }

  function showInspect(container, node) {
    var existing = container.querySelector('.bp-inspect')
    if (existing) existing.remove()

    var panel = document.createElement('div')
    panel.className = 'bp-inspect'
    panel.style.cssText = 'position:absolute;top:8px;right:8px;width:180px;background:#22223a;border:2px solid #7eceff;border-radius:6px;padding:10px;font-size:11px;color:#ccc;max-height:calc(100% - 16px);overflow-y:auto;z-index:10;'

    var title = document.createElement('div')
    title.style.cssText = 'color:#7eceff;font-weight:700;margin-bottom:4px;font-size:12px;'
    title.textContent = node.displayName
    panel.appendChild(title)

    var cls = document.createElement('div')
    cls.style.cssText = 'color:#888;margin-bottom:8px;font-size:10px;'
    cls.textContent = node.className.split('.').pop() || node.className
    panel.appendChild(cls)

    if (node.comment) {
      var cmt = document.createElement('div')
      cmt.style.cssText = 'color:#aaa;font-style:italic;margin-bottom:8px;'
      cmt.textContent = node.comment
      panel.appendChild(cmt)
    }

    var pinsLabel = document.createElement('div')
    pinsLabel.style.cssText = 'color:#666;text-transform:uppercase;letter-spacing:.05em;font-size:9px;margin-bottom:4px;'
    pinsLabel.textContent = 'Pins'
    panel.appendChild(pinsLabel)

    node.pins.forEach(function (pin) {
      var row = document.createElement('div')
      row.style.cssText = 'margin-bottom:2px;color:' + getPinColor(pin.type) + ';'
      row.textContent = (pin.type === 'exec' ? '▶ ' : '● ') + pin.name
      panel.appendChild(row)
    })

    var closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.style.cssText = 'margin-top:10px;width:100%;background:none;border:1px solid #444;border-radius:4px;color:#888;font-size:11px;padding:4px 0;cursor:pointer;'
    closeBtn.addEventListener('click', function () { panel.remove() })
    panel.appendChild(closeBtn)

    container.appendChild(panel)
  }

  function initCanvas(container, data) {
    var nodes = data.nodes || []
    var edges = data.edges || []
    if (nodes.length === 0) return

    container.style.position = 'relative'

    var svg = ns('svg')
    svg.style.cssText = 'width:100%;height:100%;background:#1a1a2e;border-radius:8px;display:block;'
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')

    var root = ns('g')
    svg.appendChild(root)

    // State
    var tx = 0, ty = 0, scale = 1
    var dragging = false, startX = 0, startY = 0

    function applyTransform() {
      root.setAttribute('transform', 'translate(' + tx + ',' + ty + ') scale(' + scale + ')')
    }

    // Auto-fit: find bounds
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(function (n) {
      var h = nodeHeight(n)
      if (n.posX < minX) minX = n.posX
      if (n.posY < minY) minY = n.posY
      if (n.posX + NODE_W > maxX) maxX = n.posX + NODE_W
      if (n.posY + h > maxY) maxY = n.posY + h
    })
    var cw = container.clientWidth || 600
    var ch = container.clientHeight || 400
    var padding = 40
    var scaleX = (cw - padding * 2) / (maxX - minX || 1)
    var scaleY = (ch - padding * 2) / (maxY - minY || 1)
    scale = Math.min(scaleX, scaleY, 1)
    tx = (cw - (maxX - minX) * scale) / 2 - minX * scale
    ty = (ch - (maxY - minY) * scale) / 2 - minY * scale
    applyTransform()

    // Edges (under nodes)
    var nodesMap = {}
    nodes.forEach(function (n) { nodesMap[n.id] = n })
    edges.forEach(function (e) {
      var path = renderEdge(e, nodesMap)
      if (path) root.appendChild(path)
    })

    // Nodes
    nodes.forEach(function (n) {
      var g = renderNode(n)
      g.addEventListener('click', function (e) {
        e.stopPropagation()
        showInspect(container, n)
      })
      root.appendChild(g)
    })

    // Pan
    svg.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return
      dragging = true
      startX = e.clientX - tx
      startY = e.clientY - ty
      svg.style.cursor = 'grabbing'
    })
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return
      tx = e.clientX - startX
      ty = e.clientY - startY
      applyTransform()
    })
    window.addEventListener('mouseup', function () {
      if (dragging) { dragging = false; svg.style.cursor = 'grab' }
    })
    svg.style.cursor = 'grab'

    // Zoom
    svg.addEventListener('wheel', function (e) {
      e.preventDefault()
      var rect = svg.getBoundingClientRect()
      var mx = e.clientX - rect.left
      var my = e.clientY - rect.top
      var delta = e.deltaY < 0 ? 1.1 : 0.9
      var newScale = Math.min(Math.max(scale * delta, 0.1), 4)
      tx = mx - (mx - tx) * (newScale / scale)
      ty = my - (my - ty) * (newScale / scale)
      scale = newScale
      applyTransform()
    }, { passive: false })

    // Click background = close inspect
    svg.addEventListener('click', function () {
      var panel = container.querySelector('.bp-inspect')
      if (panel) panel.remove()
    })

    container.appendChild(svg)
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.bp-canvas').forEach(function (container) {
      var id = container.dataset.id
      var script = document.getElementById('bp-data-' + id)
      if (!script) return
      try {
        var data = JSON.parse(script.textContent || '{}')
        initCanvas(container, data)
      } catch (e) {
        console.warn('blueprint-viewer: failed to parse data for', id, e)
      }
    })
  })
})()
```

- [ ] **Step 2: Commit**

```bash
cd portfolio-builder
git add src/renderer/public/vendor/blueprint-viewer.js
git commit -m "feat: add standalone blueprint-viewer.js for published portfolio sites"
```

---

## Task 9: Integration test + full verification

**Files:**
- Modify: `tests/main/generator/index.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the end of `portfolio-builder/tests/main/generator/index.test.ts`:

```typescript
describe('buildSite — blueprints section', () => {
  const SAMPLE_UE = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000002A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=())
End Object`

  it('renders a paste item as a bp-canvas div with embedded JSON', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-1', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-1', kind: 'paste', content: SAMPLE_UE, label: 'Begin Play' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('class="bp-canvas"')
    expect(html).toContain('id="bp-data-item-1"')
    expect(html).toContain('K2Node_Event')
    expect(html).toContain('Begin Play')
    expect(html).toContain('blueprint-viewer.js')
  })

  it('renders an image item as an img tag', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-2', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-2', kind: 'image', content: 'screenshot.png', label: 'Overview' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('src="assets/screenshot.png"')
    expect(html).toContain('class="lb-trigger bp-img"')
    expect(html).toContain('Overview')
    expect(html).not.toContain('blueprint-viewer.js')
  })

  it('includes lightbox script when a blueprints section has image items', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        {
          id: 'bp-4', type: 'blueprints', title: 'My Blueprints', visible: true,
          items: [{ id: 'item-4', kind: 'image', content: 'shot.png' }],
        } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('id="lb"')
  })

  it('renders an empty blueprints section with placeholder text', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'bp-3', type: 'blueprints', title: 'My Blueprints', visible: true, items: [] } as any,
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('No blueprints yet.')
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
cd portfolio-builder
npm run test:main -- --reporter=verbose 2>&1 | tail -20
```

Expected: 3 new tests FAIL with rendering-related errors.

- [ ] **Step 3: Run all tests after implementation is in place**

```bash
cd portfolio-builder
npm run test
```

Expected: all tests pass (parser tests + generator tests).

- [ ] **Step 4: Type-check everything**

```bash
cd portfolio-builder
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Test preview in the app**

```bash
cd portfolio-builder
npm run dev
```

- Add a Blueprints section to a portfolio
- Paste a UE Blueprint copy-text snippet
- Add a screenshot image
- Click Preview in the browser
- Confirm the published page shows the interactive SVG graph (pan/zoom/click) and the screenshot image

- [ ] **Step 6: Commit**

```bash
cd portfolio-builder
git add tests/main/generator/index.test.ts
git commit -m "test: add integration tests for blueprints section generator"
```
