# Launchpad — Bug Fixes, Polish & Lazy Loading

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 confirmed bugs from user testing, polish the ThemeCustomiser and image editor UX, and add lazy loading across all media-heavy sections so large portfolios don't lag.

**Architecture:** Changes span five areas: (1) TipTap extensions (Callout, Highlight), (2) the shared RichTextEditor toolbar, (3) the static site generator template, (4) editor React components (Stats, ThemeCustomiser, ContentSection, GallerySection, ModelsSection, VideosSection), (5) the Electron CSP in index.html. Lazy loading uses native `loading="lazy"` for `<img>` and `<iframe>` elements, `preload="none"` for local `<video>`, and IntersectionObserver to defer `<model-viewer>` src until visible.

**Tech Stack:** Electron + React 18 + TypeScript + TipTap 2.x + electron-vite. No new dependencies needed.

---

## File Map

| File | What changes |
|------|-------------|
| `src/renderer/index.html` | CSP: add `'self'` to `worker-src` |
| `src/renderer/src/lib/tiptap/Callout.ts` | `insertCallout`: `wrapIn` → `insertContent` |
| `src/renderer/src/components/shared/RichTextEditor.tsx` | Highlight picker, code-block dark styling, click-below affordance, Shift+Enter hint |
| `src/main/generator/template.ts` | `var(--dark-2)` → `var(--text)` for text on dark card backgrounds; add `loading="lazy"` to generated `<img>` |
| `src/renderer/src/components/sections/StatsSection.tsx` | Stat value overflow: `word-break` + `overflow: hidden` |
| `src/renderer/src/components/shared/ThemeCustomiser.tsx` | Add descriptive subtitle under each customisation row |
| `src/renderer/src/types/portfolio.ts` | Add `objectFit?: 'cover' \| 'contain'` to `ContentImageBlock` |
| `src/renderer/src/components/sections/ContentSection.tsx` | Image block: objectFit selector + `loading="lazy"` |
| `src/main/generator/sections/content.ts` | Respect `objectFit` in generated `<img>` |
| `src/renderer/src/components/sections/GallerySection.tsx` | `loading="lazy"` on gallery thumbnails |
| `src/renderer/src/components/sections/ProjectSection.tsx` | `loading="lazy"` on cover + project images |
| `src/renderer/src/components/sections/VideosSection.tsx` | `preload="none"` on local `<video>` + IntersectionObserver lazy-src |
| `src/renderer/src/components/sections/ModelsSection.tsx` | IntersectionObserver: only set `src` on `<model-viewer>` when in view |

---

## Task 1 — Fix CSP so model-viewer decoder workers can load

**Files:**
- Modify: `src/renderer/index.html`

The CSP currently has `worker-src blob:` which blocks workers created from same-origin scripts. model-viewer internally spawns decoder workers (Draco, KTX2) which may use `'self'`-origin URLs. Adding `'self'` unblocks them.

- [ ] **Step 1: Update worker-src in the CSP meta tag**

In `src/renderer/index.html`, change the `content` attribute of the CSP meta tag from:
```
worker-src blob:;
```
to:
```
worker-src blob: 'self';
```

Full updated line (the entire `content` attribute value):
```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: blob: https://i.ytimg.com; media-src 'self' asset: blob:; worker-src blob: 'self'; connect-src 'self' blob: asset:; frame-src *;
```

- [ ] **Step 2: Commit**
```
git add src/renderer/index.html
git commit -m "fix: allow self-origin workers in CSP (model-viewer decoders)"
```

---

## Task 2 — Fix callout insertion (wrapIn → insertContent)

**Files:**
- Modify: `src/renderer/src/lib/tiptap/Callout.ts`

`wrapIn` silently fails when the cursor is inside a heading, list item, or any node that can't be wrapped by the current parent. `insertContent` splits the surrounding block and inserts a new callout node unconditionally.

- [ ] **Step 1: Replace `insertCallout` command in `addCommands()`**

Replace the entire `addCommands()` block with:
```ts
addCommands() {
  return {
    insertCallout: (calloutType: CalloutType = 'info') =>
      ({ commands }) =>
        commands.insertContent({
          type: this.name,
          attrs: { calloutType },
          content: [{ type: 'paragraph' }],
        }),

    setCalloutType: (calloutType: CalloutType) =>
      ({ commands }) => commands.updateAttributes(this.name, { calloutType }),
  }
},
```

- [ ] **Step 2: Commit**
```
git add src/renderer/src/lib/tiptap/Callout.ts
git commit -m "fix: callout insertion uses insertContent instead of wrapIn"
```

---

## Task 3 — Add highlight colour picker

**Files:**
- Modify: `src/renderer/src/components/shared/RichTextEditor.tsx`

Currently `Highlight.configure({ multicolor: false })` means the H button only toggles a single yellow. Switching to `multicolor: true` and adding a colour picker dropdown (mirroring the text colour picker) gives users selectable highlight colours.

- [ ] **Step 1: Change Highlight config and add state**

In the `useEditor` extensions array, change:
```ts
Highlight.configure({ multicolor: false }),
```
to:
```ts
Highlight.configure({ multicolor: true }),
```

Add a new state variable alongside the existing ones (near `const [showColours, setShowColours] = useState(false)`):
```ts
const [showHighlights, setShowHighlights] = useState(false)
```

Add a `HIGHLIGHT_COLOURS` constant just below the existing `COLOURS` constant:
```ts
const HIGHLIGHT_COLOURS = [
  '#fef08a', '#fde68a', '#fed7aa',  // yellows / oranges
  '#bbf7d0', '#a7f3d0', '#99f6e4',  // greens / teals
  '#bfdbfe', '#c7d2fe', '#ddd6fe',  // blues / purples
  '#fecdd3', '#fda4af', '#f9a8d4',  // pinks / reds
]
```

- [ ] **Step 2: Replace the single Highlight button with a dropdown**

Find the existing single-button highlight line:
```tsx
{/* Highlight / background colour */}
<Btn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
  <span style={{ background: '#fef08a', padding: '0 3px', borderRadius: 2, fontSize: 11, lineHeight: 1.4 }}>H</span>
</Btn>
```

Replace it with this dropdown (same pattern as the text colour picker):
```tsx
{/* Highlight colour */}
<div style={{ position: 'relative' }}>
  <Btn
    title="Highlight colour"
    active={editor.isActive('highlight') || showHighlights}
    onClick={() => setShowHighlights(v => !v)}
  >
    <span style={{
      background: editor.getAttributes('highlight').color ?? '#fef08a',
      padding: '0 3px', borderRadius: 2, fontSize: 11, lineHeight: 1.4,
      border: '1px solid rgba(0,0,0,0.1)',
    }}>H</span>
  </Btn>
  {showHighlights && (
    <div
      style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: 6, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: 116 }}
      onMouseDown={e => e.preventDefault()}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 20px)', gap: 4, marginBottom: 4 }}>
        {HIGHLIGHT_COLOURS.map(c => (
          <div
            key={c}
            onMouseDown={e => {
              e.preventDefault()
              editor.chain().focus().setHighlight({ color: c }).run()
              setShowHighlights(false)
            }}
            style={{ width: 20, height: 20, borderRadius: 3, background: c, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.12)' }}
            title={c}
          />
        ))}
        <div
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().unsetHighlight().run()
            setShowHighlights(false)
          }}
          style={{ width: 20, height: 20, borderRadius: 3, background: 'white', cursor: 'pointer', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#aaa' }}
          title="Remove highlight"
        >✕</div>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: Add `showHighlights` to the close-on-outside-click effect**

Find the `useEffect` that closes menus:
```ts
function handleClick() { setShowColours(false); setShowTableMenu(false); setShowDividerMenu(false); setShowCalloutMenu(false) }
```
Add `setShowHighlights(false)`:
```ts
function handleClick() { setShowColours(false); setShowHighlights(false); setShowTableMenu(false); setShowDividerMenu(false); setShowCalloutMenu(false) }
```

- [ ] **Step 4: Commit**
```
git add src/renderer/src/components/shared/RichTextEditor.tsx
git commit -m "feat: highlight colour picker with 12 selectable colours"
```

---

## Task 4 — Editor polish: code block contrast, Shift+Enter hint, click-below affordance

**Files:**
- Modify: `src/renderer/src/components/shared/RichTextEditor.tsx`

Three UX fixes in one go: (1) code blocks in the editor now use dark background/light text (matches the preview, prevents any light-on-light invisibility), (2) a small hint text below the toolbar explains Shift+Enter, (3) a thin click-target below the editor lets users escape nested blocks.

- [ ] **Step 1: Update code block CSS in `ensureEditorStyles`**

Find in the `s.textContent` string:
```
.tiptap pre { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
.tiptap pre code { background: none; padding: 0; }
```
Replace with:
```
.tiptap pre { background: #1e293b; color: #e2e8f0; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
.tiptap pre code { background: none; padding: 0; color: inherit; }
```

- [ ] **Step 2: Add Shift+Enter hint below the toolbar**

In the JSX, the toolbar div ends with:
```tsx
      </div>

      {/* ── Link input bar ── */}
```

Add a hint line between the toolbar and the link bar (after the closing `</div>` of the main toolbar `<div>`):
```tsx
      {/* ── Shift+Enter hint ── */}
      <div style={{ padding: '2px 10px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontSize: 10, color: '#bbb' }}>
        Shift+Enter = soft line break &nbsp;·&nbsp; Enter = new paragraph
      </div>
```

- [ ] **Step 3: Add click-below affordance after EditorContent**

Find the last line of the JSX return:
```tsx
      <EditorContent editor={editor} style={{ padding: '12px 16px', minHeight, fontSize: 14, lineHeight: 1.6 }} />
    </div>
```

Replace with:
```tsx
      <EditorContent editor={editor} style={{ padding: '12px 16px', minHeight, fontSize: 14, lineHeight: 1.6 }} />
      {/* Click-below affordance: places cursor at end of document */}
      <div
        style={{ height: 24, cursor: 'text' }}
        onMouseDown={e => {
          e.preventDefault()
          editor.chain().focus().command(({ tr, state }) => {
            tr.setSelection(state.selection.constructor.atEnd(state.doc) as any)
            return true
          }).run()
          // Fallback: just focus at end
          editor.commands.focus('end')
        }}
      />
    </div>
```

- [ ] **Step 4: Commit**
```
git add src/renderer/src/components/shared/RichTextEditor.tsx
git commit -m "fix: dark code blocks in editor, Shift+Enter hint, click-below to escape"
```

---

## Task 5 — Fix dark theme text colours in generated template

**Files:**
- Modify: `src/main/generator/template.ts`

For dark themes (Midnight), `--dark-2` is `#111827` — near-black. Cards use `--card: #1e293b` — dark. Any text using `color: var(--dark-2)` is near-invisible on dark cards. These all need `color: var(--text)` which is `#f1f5f9` for dark themes and `#1e293b` for light themes.

- [ ] **Step 1: Fix section-title colour**

Find:
```css
.section-title { font-size: 19px; font-weight: 700; margin-bottom: 24px; padding-left: 14px; border-left: 4px solid var(--accent); color: var(--dark-2); }
```
Replace `color: var(--dark-2)` with `color: var(--text)`.

- [ ] **Step 2: Fix video-caption colour**

Find:
```css
.video-caption { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--dark-2); }
```
Replace `color: var(--dark-2)` with `color: var(--text)`.

- [ ] **Step 3: Fix game heading colour**

Find:
```css
.game-item h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--dark-2); }
```
Replace `color: var(--dark-2)` with `color: var(--text)`.

- [ ] **Step 4: Fix timeline title colour**

Find:
```css
.tl-title { font-size: 16px; font-weight: 600; color: var(--dark-2); margin-bottom: 4px; }
```
Replace `color: var(--dark-2)` with `color: var(--text)`.

- [ ] **Step 5: Fix progress label colour**

Find:
```css
.progress-label { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--dark-2); margin-bottom: 6px; }
```
Replace `color: var(--dark-2)` with `color: var(--text)`.

- [ ] **Step 6: Add `loading="lazy"` to gallery and project images in the template**

In `buildNavLinks` and the gallery/project section generators, images are rendered via the section-specific generator files (not inline in template.ts). Skip this step — lazy loading for generated HTML is handled in Task 12 (generator section files).

- [ ] **Step 7: Commit**
```
git add src/main/generator/template.ts
git commit -m "fix: section text colours use --text so dark themes are readable"
```

---

## Task 6 — Fix stats card overflow

**Files:**
- Modify: `src/renderer/src/components/sections/StatsSection.tsx`

The value `<input>` has `fontSize: 28` inside a `minmax(140px, 1fr)` grid cell. Long values overflow without wrapping. The fix clamps the font size dynamically and adds word-break.

- [ ] **Step 1: Update the stat value input style**

Find the stat value input (it has `fontSize: 28, fontWeight: 800, color: '#6366f1'`):
```tsx
style={{ display: 'block', width: '100%', border: 'none', textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#6366f1', outline: 'none', background: 'transparent', boxSizing: 'border-box', marginBottom: 6 }}
```
Replace with:
```tsx
style={{ display: 'block', width: '100%', border: 'none', textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#6366f1', outline: 'none', background: 'transparent', boxSizing: 'border-box', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
```

- [ ] **Step 2: Update the stat label input style**

Find the stat label input (it has `fontSize: 12, color: '#64748b'`):
```tsx
style={{ display: 'block', width: '100%', border: 'none', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#64748b', outline: 'none', background: 'transparent', boxSizing: 'border-box', paddingTop: 6 }}
```
Replace with:
```tsx
style={{ display: 'block', width: '100%', border: 'none', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#64748b', outline: 'none', background: 'transparent', boxSizing: 'border-box', paddingTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
```

- [ ] **Step 3: Commit**
```
git add src/renderer/src/components/sections/StatsSection.tsx
git commit -m "fix: stats card value and label truncate instead of overflowing"
```

---

## Task 7 — ThemeCustomiser: add descriptive labels

**Files:**
- Modify: `src/renderer/src/components/shared/ThemeCustomiser.tsx`

Currently the palette has no explanation of what each colour controls. Users see "Accent colour", "Background", "Font" without context. Add a small subtitle under each label.

- [ ] **Step 1: Add subtitle style to the component**

At the top of the `ThemeCustomiser` function body, add a style variable after the `lbl` variable:
```ts
const sub: React.CSSProperties = { fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }
```

- [ ] **Step 2: Update the Accent colour row**

Find:
```tsx
<span style={lbl}>Accent colour</span>
```
Replace with:
```tsx
<div style={{ width: 110, flexShrink: 0 }}>
  <div style={lbl}>Accent colour</div>
  <div style={sub}>Buttons, links &amp; highlights</div>
</div>
```

- [ ] **Step 3: Update the Background row**

Find:
```tsx
<span style={lbl}>Background</span>
```
Replace with:
```tsx
<div style={{ width: 110, flexShrink: 0 }}>
  <div style={lbl}>Background</div>
  <div style={sub}>Page colour behind cards</div>
</div>
```

- [ ] **Step 4: Update the Font row**

Find:
```tsx
<span style={lbl}>Font</span>
```
Replace with:
```tsx
<div style={{ width: 110, flexShrink: 0 }}>
  <div style={lbl}>Font</div>
  <div style={sub}>Text style throughout portfolio</div>
</div>
```

- [ ] **Step 5: Update the row style to align items to flex-start**

The current `row` style has `alignItems: 'center'`. With multi-line labels, change to `alignItems: 'flex-start'`:
```ts
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
}
```

- [ ] **Step 6: Commit**
```
git add src/renderer/src/components/shared/ThemeCustomiser.tsx
git commit -m "feat: theme customiser labels include descriptive subtitles"
```

---

## Task 8 — Image blocks: add objectFit (scale) option

**Files:**
- Modify: `src/renderer/src/types/portfolio.ts`
- Modify: `src/renderer/src/components/sections/ContentSection.tsx`
- Modify: `src/main/generator/sections/content.ts`

Currently `ImageBlockEditor` forces `objectFit: 'cover'` which crops tall images. Adding a `cover / contain` toggle lets users choose. The generated HTML also needs to respect this.

- [ ] **Step 1: Add `objectFit` field to `ContentImageBlock`**

In `src/renderer/src/types/portfolio.ts`, find:
```ts
export interface ContentImageBlock     { id: string; type: 'image';      filename: string; caption?: string; alt?: string }
```
Replace with:
```ts
export interface ContentImageBlock     { id: string; type: 'image';      filename: string; caption?: string; alt?: string; objectFit?: 'cover' | 'contain' }
```

- [ ] **Step 2: Add scale toggle to `ImageBlockEditor` in ContentSection.tsx**

In `ContentSection.tsx`, find the `ImageBlockEditor` function. After the existing `<div style={{ position: 'relative' }}>` image display block (the one that shows the image with an × button), add a scale toggle row:

Replace the existing image-is-present JSX:
```tsx
{block.filename ? (
  <div style={{ position: 'relative' }}>
    <img
      src={toFileUrl(`${portfolioDir}/assets/${block.filename}`)}
      style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, display: 'block' }}
      alt={block.alt ?? block.caption ?? block.filename}
    />
    <button
      onClick={() => onChange({ filename: '' })}
      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
    >×</button>
  </div>
) : (
```

With:
```tsx
{block.filename ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ position: 'relative' }}>
      <img
        src={toFileUrl(`${portfolioDir}/assets/${block.filename}`)}
        style={{ width: '100%', maxHeight: 300, objectFit: block.objectFit ?? 'cover', borderRadius: 8, display: 'block' }}
        alt={block.alt ?? block.caption ?? block.filename}
        loading="lazy"
      />
      <button
        onClick={() => onChange({ filename: '' })}
        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
      >×</button>
    </div>
    <div style={{ display: 'flex', gap: 4 }}>
      {(['cover', 'contain'] as const).map(fit => (
        <button
          key={fit}
          onClick={() => onChange({ objectFit: fit })}
          style={{
            flex: 1, padding: '4px 8px', border: `1px solid ${(block.objectFit ?? 'cover') === fit ? '#6366f1' : '#ddd'}`,
            borderRadius: 4, background: (block.objectFit ?? 'cover') === fit ? '#f0f0ff' : 'white',
            cursor: 'pointer', fontSize: 11, color: (block.objectFit ?? 'cover') === fit ? '#6366f1' : '#555',
          }}
        >
          {fit === 'cover' ? 'Fill (crop)' : 'Fit (full image)'}
        </button>
      ))}
    </div>
  </div>
) : (
```

- [ ] **Step 3: Read content.ts to understand current image generation**

Open `src/main/generator/sections/content.ts` and find the image block rendering. It likely outputs something like:
```ts
case 'image':
  return `<img src="assets/${block.filename}" ...>`
```

Look for the `objectFit` or `style` attribute on the `<img>` tag.

- [ ] **Step 4: Update content.ts to respect objectFit**

In `src/main/generator/sections/content.ts`, find the image block case. Add `object-fit` inline style to the generated `<img>`:

The current image output (based on codebase patterns) will be something like:
```ts
case 'image': {
  if (!block.filename) return ''
  const fit = (block as any).objectFit ?? 'cover'
  const caption = block.caption ? `<p class="cb-caption">${escHtml(block.caption)}</p>` : ''
  return `<figure class="cb-image">
    <img src="assets/${escHtml(block.filename)}" alt="${escHtml(block.alt ?? block.caption ?? block.filename)}" style="object-fit:${fit}" loading="lazy">
    ${caption}
  </figure>`
}
```

Read the file first (Step 3), then apply the minimal change: add `style="object-fit:${fit}"` to the existing `<img>` tag and `loading="lazy"`.

- [ ] **Step 5: Commit**
```
git add src/renderer/src/types/portfolio.ts src/renderer/src/components/sections/ContentSection.tsx src/main/generator/sections/content.ts
git commit -m "feat: image blocks have cover/contain scale option and lazy loading"
```

---

## Task 9 — Lazy loading: gallery and project images in the editor

**Files:**
- Modify: `src/renderer/src/components/sections/GallerySection.tsx`
- Modify: `src/renderer/src/components/sections/ProjectSection.tsx`

Add `loading="lazy"` to every `<img>` that renders portfolio media. Chromium (Electron) fully supports this natively — zero additional code needed.

- [ ] **Step 1: Add `loading="lazy"` to GallerySection thumbnails**

In `src/renderer/src/components/sections/GallerySection.tsx`, find the `<img>` inside `SortableItem`:
```tsx
<img
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
  alt={item.caption ?? item.filename}
  draggable={false}
/>
```
Add `loading="lazy"`:
```tsx
<img
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
  alt={item.caption ?? item.filename}
  draggable={false}
  loading="lazy"
/>
```

- [ ] **Step 2: Add `loading="lazy"` to ProjectSection images**

In `src/renderer/src/components/sections/ProjectSection.tsx`, find both `<img>` elements (cover image and project screenshots). Add `loading="lazy"` to each one.

- [ ] **Step 3: Commit**
```
git add src/renderer/src/components/sections/GallerySection.tsx src/renderer/src/components/sections/ProjectSection.tsx
git commit -m "perf: lazy-load gallery and project images in the editor"
```

---

## Task 10 — Lazy loading: local videos defer decode until visible

**Files:**
- Modify: `src/renderer/src/components/sections/VideosSection.tsx`

Local `<video>` elements decode and buffer the whole file by default. `preload="none"` tells the browser not to buffer until the user interacts. For the editor (where many videos might be in a list), this prevents large memory use. iframes already load lazily via browser optimisations but we can add `loading="lazy"` too.

- [ ] **Step 1: Add `preload="none"` to local video elements**

In `src/renderer/src/components/sections/VideosSection.tsx`, find all `<video ... controls />` elements (there are two — one in the sortable item and one in the empty-block editor). Add `preload="none"` to each.

Find in `SortableVideoItem`:
```tsx
<video
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  controls
/>
```
Replace with:
```tsx
<video
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  controls
  preload="none"
/>
```

Find the second `<video>` in `VideoBlockEditor` (inside the `block.filename` branch of `ContentSection.tsx` — note: this is in ContentSection, not VideosSection):
```tsx
<video src={toFileUrl(`${portfolioDir}/assets/${block.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
```
Add `preload="none"` here too (in `src/renderer/src/components/sections/ContentSection.tsx`).

- [ ] **Step 2: Add `loading="lazy"` to embedded iframes**

In `SortableVideoItem` in `VideosSection.tsx`, find:
```tsx
<iframe
  src={item.embedUrl}
  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
  allowFullScreen
  title={item.caption ?? 'Video'}
/>
```
Add `loading="lazy"`:
```tsx
<iframe
  src={item.embedUrl}
  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
  allowFullScreen
  title={item.caption ?? 'Video'}
  loading="lazy"
/>
```

- [ ] **Step 3: Commit**
```
git add src/renderer/src/components/sections/VideosSection.tsx src/renderer/src/components/sections/ContentSection.tsx
git commit -m "perf: videos use preload=none and iframes use loading=lazy in editor"
```

---

## Task 11 — Lazy loading: model-viewer defers until visible

**Files:**
- Modify: `src/renderer/src/components/sections/ModelsSection.tsx`

`<model-viewer>` starts rendering immediately — GPU-heavy WebGL work for every model in the list. Using IntersectionObserver to set `src` only when the element enters the viewport reduces memory and GPU load for portfolios with many models.

- [ ] **Step 1: Create a `LazyModelViewer` wrapper component**

Add this component above `SortableModelItem` in `ModelsSection.tsx`:

```tsx
function LazyModelViewer({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', height: '260px', background: '#f0f0f0', borderRadius: 4 }}>
      {visible && (
        /* @ts-ignore */
        <model-viewer
          src={src}
          alt={alt}
          auto-rotate
          camera-controls
          style={{ width: '100%', height: '260px', display: 'block' }}
        />
      )}
    </div>
  )
}
```

Add `useRef` and `useEffect` to the import line at the top of the file:
```ts
import { useState, useEffect, useRef } from 'react'
```
(Currently only `useState` is imported from react.)

- [ ] **Step 2: Replace `<model-viewer>` in `SortableModelItem` with `<LazyModelViewer>`**

In `SortableModelItem`, find:
```tsx
{/* @ts-ignore */}
<model-viewer
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  alt={item.label ?? item.filename}
  auto-rotate camera-controls
  style={{ width: '100%', height: '260px', display: 'block' }}
/>
```
Replace with:
```tsx
<LazyModelViewer
  src={toFileUrl(`${portfolioDir}/assets/${item.filename}`)}
  alt={item.label ?? item.filename}
/>
```

- [ ] **Step 3: Commit**
```
git add src/renderer/src/components/sections/ModelsSection.tsx
git commit -m "perf: model-viewer defers WebGL rendering until visible (IntersectionObserver)"
```

---

## Task 12 — Lazy loading: generated site HTML

**Files:**
- Modify: `src/main/generator/sections/gallery.ts`
- Modify: `src/main/generator/sections/project.ts`
- Modify: `src/main/generator/template.ts` (hero avatar image)

Add `loading="lazy"` to images in the generated static site. The hero avatar is above-the-fold and should stay `loading="eager"` (omit the attribute). Everything else gets lazy.

- [ ] **Step 1: Read gallery.ts to find the img tag**

Open `src/main/generator/sections/gallery.ts` and find the `<img>` element in the gallery item. Add `loading="lazy"` to it. Pattern to find: `<img src="assets/`.

- [ ] **Step 2: Read project.ts to find img tags**

Open `src/main/generator/sections/project.ts` and find `<img>` elements for cover image and project images. Add `loading="lazy"` to each (skip the cover if it's positioned near the top — add it to the project screenshot grid images at minimum).

- [ ] **Step 3: Add lazy loading to content section images**

This was already handled in Task 8 (content.ts). Confirm the `loading="lazy"` attribute was added there.

- [ ] **Step 4: Commit**
```
git add src/main/generator/sections/gallery.ts src/main/generator/sections/project.ts
git commit -m "perf: generated site images load lazily"
```

---

## Items Deferred to Runtime Verification

The following were reported in testing but have no visible code bug — they need the app running to reproduce:

| Issue | Status | Where to look |
|-------|--------|---------------|
| Font colour doesn't apply | Verify at runtime | `RichTextEditor.tsx` swatch `onMouseDown` + TipTap `setColor` |
| Insert Divider (─▾) not working | Verify at runtime | `StyledDivider.ts` `insertDivider` command |
| Insert Table not working | Verify at runtime | TipTap `insertTable` command |
| Some images not displaying | Needs specific cases | `asset://` protocol + `toFileUrl` path construction |
| Code snippet invisible in editor | May be fixed by Task 4 (dark code blocks) | `ensureEditorStyles` `.tiptap pre` |

If any of these reproduce after the above fixes are deployed, investigate at runtime and open a separate fix.

---

## Commit Summary

After all tasks, the branch will have these commits (in order):
1. `fix: allow self-origin workers in CSP (model-viewer decoders)`
2. `fix: callout insertion uses insertContent instead of wrapIn`
3. `feat: highlight colour picker with 12 selectable colours`
4. `fix: dark code blocks in editor, Shift+Enter hint, click-below to escape`
5. `fix: section text colours use --text so dark themes are readable`
6. `fix: stats card value and label truncate instead of overflowing`
7. `feat: theme customiser labels include descriptive subtitles`
8. `feat: image blocks have cover/contain scale option and lazy loading`
9. `perf: lazy-load gallery and project images in the editor`
10. `perf: videos use preload=none and iframes use loading=lazy in editor`
11. `perf: model-viewer defers WebGL rendering until visible (IntersectionObserver)`
12. `perf: generated site images load lazily`
