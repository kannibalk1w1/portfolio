# Blueprint Section — Design Spec

**Date:** 2026-05-13
**Branch:** feature/build-mvp

## Overview

Add a new `blueprints` section type to Launchpad that lets CYPs display their Unreal Engine Blueprint graphs in their portfolio. Supports two input modes: pasting UE copy-text (rendered as an interactive node graph) and uploading a screenshot (displayed as an image). Replaces the need for external sites like blueprintue.com, which is blocked in the UK under the Online Safety Act.

---

## Data Model

New section type added to the portfolio schema alongside existing types:

```typescript
interface BlueprintsSection extends SectionBase {
  type: 'blueprints'
  items: BlueprintItem[]
}

interface BlueprintItem {
  id: string
  kind: 'paste' | 'image'
  content: string   // raw UE copy-text for 'paste'; filename in assets/ for 'image'
  label?: string
}
```

`content` for `'paste'` items stores the raw UE copy-text verbatim (same pattern as `CodeSection`). `content` for `'image'` items stores a filename in `assets/` (same pattern as `GallerySection`).

---

## Editor UX

The section editor panel follows the `ModelsSection` pattern: a list of existing items with drag-to-reorder (dnd-kit), label input, and remove button per item. Below the list, an "add" area uses two explicit tabs:

- **"Paste text" tab** — a `<textarea>` with monospace font, placeholder text showing the `Begin Object …` format, and an "Add blueprint" button. On submit, the raw text is validated (must contain at least one `Begin Object` block) and stored as a `'paste'` item.
- **"Screenshot" tab** — reuses `MediaDropzone` accepting PNG/JPEG/GIF/WEBP, imports via `window.api.importMedia`, stored as an `'image'` item.

---

## Blueprint Viewer Component

`BlueprintViewer` receives a raw UE copy-text string, parses it, and renders the graph using **React Flow**.

### Layout

- Full-width canvas with dark background (`#1a1a2e`) matching UE editor aesthetics
- Fixed height in the editor (320px); fills available width
- Pan (drag) and zoom (scroll/pinch) via React Flow's built-in controls
- Minimap (bottom-right) and +/− zoom buttons (bottom-left)
- On node click: inspect panel slides in from the right (fixed width ~180px), showing node title, class name, and all pin names/types

### Node colour coding by class prefix

| Class prefix | Colour | Examples |
|---|---|---|
| `K2Node_Event` | Red `#c0392b` | BeginPlay, Tick |
| `K2Node_CallFunction` | Blue `#2980b9` | PrintString, SetActorLocation |
| `K2Node_VariableGet`, `K2Node_VariableSet` | Green `#27ae60` | Get/Set any variable |
| `K2Node_IfThenElse`, `K2Node_ExecutionSequence`, `K2Node_Select` | Purple `#8e44ad` | Branch, Sequence |
| Everything else | Grey `#555` | Macros, casts, etc. |

Each node renders as a dark card with a coloured header, exec pins (white ▶), and data pins (coloured by type — green for String/Name, yellow for Float/Int, red for Boolean, white for Object/Actor).

---

## UE Copy-Text Parser

**Location:** `src/renderer/src/lib/blueprint/parseUECopyText.ts`

**Input:** Raw string from Ctrl+C in the UE Blueprint editor.

**Algorithm:**

1. Split on `Begin Object` / `End Object` boundaries — each block is one node
2. Per block, extract:
   - `Class=` → node type / colour category
   - `NodePosX=`, `NodePosY=` → React Flow position
   - `NodeGuid=` → unique identifier for edge resolution
   - `NodeComment=` → optional comment shown in inspect panel
   - All `CustomProperties Pin (…)` lines → parse pin name, direction, type, and `LinkedTo=(NodeGuid PinId)` for edge building
3. Derive node display name from the class name (strip `K2Node_` prefix, insert spaces before capitals)
4. Build edges by matching `LinkedTo` GUIDs across all parsed nodes
5. Return `{ nodes: RFNode[], edges: RFEdge[] }`

Pure TypeScript, no DOM dependency — fully unit-testable in isolation.

---

## Published Site & Export

- **React Flow** is bundled at build time into the Electron renderer. A standalone `blueprint-viewer.js` bundle (pre-built and shipped inside the app's resources) is copied by the static site generator into the exported site's `assets/` folder; blueprint section HTML references it via a `<script>` tag.
- **ZIP / offline export** — `blueprint-viewer.js` is already a local file in `assets/`, so it works offline automatically (no base64 embedding needed).
- **Screenshot items** — handled identically to Gallery images: copied to `assets/`, displayed as `<img>` with lightbox.
- **FTP publish** — same as all other assets; uploaded to the remote server alongside the rest of the site.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Paste contains no valid `Begin Object` blocks | Inline error banner: *"Couldn't read this blueprint. Try copying again from the UE editor, or use a screenshot instead."* Raw text preserved. |
| Partial parse (some edges reference missing GUIDs) | Render available nodes silently; drop broken connections. Partial graph beats blank screen. |
| Empty section (no items) | Subtle placeholder matching other section empty states. |
| Image import failure | Reuses existing `importError` toast pattern from `ModelsSection`. |

---

## Out of Scope

- Editing blueprint nodes or wires
- Exporting from `.uasset` binary files
- Syncing with a live UE project
- CYP self-service mode (deferred post-MVP)
