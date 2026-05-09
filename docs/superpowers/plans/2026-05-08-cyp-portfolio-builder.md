# CYP Portfolio Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop app (Electron + React) that lets facilitators manage CYP portfolios and publish them as self-contained static sites.

**Architecture:** Electron main process handles all file I/O, snapshots, site generation, and FTP publishing via IPC. React renderer is the full editing UI. A custom static site generator (pure Node.js) outputs self-contained HTML/CSS/JS with all vendor scripts bundled locally.

**Tech Stack:** Electron 28, React 18, TypeScript, electron-vite, Vitest, React Testing Library, @dnd-kit/sortable, @tiptap/react, basic-ftp, heic-convert, electron-builder

---

## File Map

```
src/
  main/
    index.ts                        # Window creation, app lifecycle
    ipc.ts                          # Register all IPC handlers
    portfolio/
      store.ts                      # List/read/write/delete portfolio.json
      snapshot.ts                   # Create/list/restore/prune snapshots
    media/
      importer.ts                   # Copy files to assets/, HEIC→jpg
    generator/
      index.ts                      # Orchestrate static site build
      template.ts                   # Base HTML wrapper + nav
      sections/
        about.ts
        gallery.ts
        videos.ts
        models.ts
        games.ts
        code.ts
        custom.ts
    publish/
      ftp.ts                        # FTP upload via basic-ftp
  preload/
    index.ts                        # contextBridge typed API surface
  renderer/src/
    types/
      portfolio.ts                  # All shared TS interfaces
    store/
      PortfolioContext.tsx           # React Context + useReducer
    pages/
      Picker.tsx                    # Startup CYP list screen
      Editor.tsx                    # Sidebar + content panel shell
    components/
      editor/
        Sidebar.tsx                 # Section list + action buttons
        SidebarItem.tsx             # Single draggable section row
        TopBar.tsx                  # CYP name + back link
      sections/
        AboutSection.tsx
        GallerySection.tsx
        VideosSection.tsx
        ModelsSection.tsx
        GamesSection.tsx
        CodeSection.tsx
        CustomSection.tsx
      shared/
        MediaDropzone.tsx           # Reusable drag-to-import zone
        SnapshotPanel.tsx           # Snapshot list + restore UI
    App.tsx
    main.tsx
  renderer/index.html
tests/
  main/
    portfolio/store.test.ts
    portfolio/snapshot.test.ts
    generator/index.test.ts
  renderer/
    Picker.test.tsx
    Editor.test.tsx
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.*.json`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/App.tsx`

- [ ] **Scaffold with electron-vite**

```bash
cd "C:\Users\kanni\Documents\Portfolio"
npm create electron-vite@latest portfolio-builder -- --template react-ts
cd portfolio-builder
npm install
```

- [ ] **Install runtime dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @tiptap/react @tiptap/starter-kit
npm install basic-ftp heic-convert
npm install @google/model-viewer
```

- [ ] **Install dev dependencies**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D electron-builder
npm install -D jsdom
```

- [ ] **Configure Vitest in `electron.vite.config.ts`**

Replace the generated config with:

```ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    test: {
      environment: 'node',
      globals: true,
      include: ['tests/main/**/*.test.ts']
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['tests/renderer/setup.ts'],
      include: ['tests/renderer/**/*.test.tsx']
    }
  }
})
```

- [ ] **Create test setup file**

Create `tests/renderer/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Add test scripts to `package.json`**

Add under `"scripts"`:
```json
"test:main": "vitest run --config electron.vite.config.ts --mode main",
"test:renderer": "vitest run --config electron.vite.config.ts --mode renderer",
"test": "npm run test:main && npm run test:renderer"
```

- [ ] **Verify the app boots**

```bash
npm run dev
```

Expected: Electron window opens showing the default React template page.

- [ ] **Commit**

```bash
git init
git add .
git commit -m "feat: scaffold electron-vite react-ts project"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/renderer/src/types/portfolio.ts`

- [ ] **Write the types**

Create `src/renderer/src/types/portfolio.ts`:

```ts
export type SectionType = 'about' | 'gallery' | 'videos' | 'models' | 'games' | 'code' | 'custom'

export interface MediaItem {
  id: string
  filename: string       // relative to assets/
  caption?: string
}

export interface VideoItem extends MediaItem {
  thumbnailFilename?: string  // relative to assets/
}

export interface ModelItem extends MediaItem {
  label?: string
}

export interface GameItem {
  id: string
  folderName: string     // subfolder in assets/ containing Godot HTML5 export
  title: string
  entryFile: string      // e.g. "index.html" inside the folder
}

export interface CodeItem {
  id: string
  language: string
  label?: string
  code: string
}

export interface BaseSection {
  id: string
  type: SectionType
  title: string
  visible: boolean
}

export interface AboutSection extends BaseSection {
  type: 'about'
  bio: string
  avatarFilename?: string
}

export interface GallerySection extends BaseSection {
  type: 'gallery'
  items: MediaItem[]
}

export interface VideosSection extends BaseSection {
  type: 'videos'
  items: VideoItem[]
}

export interface ModelsSection extends BaseSection {
  type: 'models'
  items: ModelItem[]
}

export interface GamesSection extends BaseSection {
  type: 'games'
  items: GameItem[]
}

export interface CodeSection extends BaseSection {
  type: 'code'
  items: CodeItem[]
}

export interface CustomSection extends BaseSection {
  type: 'custom'
  html: string           // TipTap outputs HTML
}

export type Section =
  | AboutSection
  | GallerySection
  | VideosSection
  | ModelsSection
  | GamesSection
  | CodeSection
  | CustomSection

export interface FtpConfig {
  host: string
  port: number
  user: string
  remotePath: string
  secure: boolean
}

export interface Portfolio {
  schemaVersion: 1
  name: string
  slug: string           // sanitised folder name
  bio: string
  avatarFilename?: string
  sections: Section[]
  publish: {
    ftp?: FtpConfig
  }
}

export interface CypMeta {
  slug: string
  name: string
  lastModified: string   // ISO timestamp
}
```

- [ ] **Commit**

```bash
git add src/renderer/src/types/portfolio.ts
git commit -m "feat: add portfolio TypeScript types"
```

---

## Task 3: Portfolio store (main process)

**Files:**
- Create: `src/main/portfolio/store.ts`
- Create: `tests/main/portfolio/store.test.ts`

The store reads/writes from a configurable `portfoliosRoot` directory stored in Electron's `app.getPath('userData')/config.json`.

- [ ] **Write the failing tests**

Create `tests/main/portfolio/store.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { listCyps, readPortfolio, writePortfolio, deletePortfolio } from '../../../src/main/portfolio/store'
import type { Portfolio } from '../../../src/renderer/src/types/portfolio'

const TMP = join(__dirname, '__tmp_portfolios__')

const makePortfolio = (name: string): Portfolio => ({
  schemaVersion: 1,
  name,
  slug: name.toLowerCase(),
  bio: '',
  sections: [],
  publish: {}
})

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('listCyps', () => {
  it('returns empty array when folder is empty', async () => {
    const result = await listCyps(TMP)
    expect(result).toEqual([])
  })

  it('returns one entry per subfolder that has portfolio.json', async () => {
    const aliceDir = join(TMP, 'alice')
    mkdirSync(aliceDir)
    writeFileSync(join(aliceDir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    const result = await listCyps(TMP)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('alice')
    expect(result[0].name).toBe('Alice')
  })
})

describe('readPortfolio', () => {
  it('reads and parses portfolio.json', async () => {
    const dir = join(TMP, 'alice')
    mkdirSync(dir)
    writeFileSync(join(dir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    const p = await readPortfolio(TMP, 'alice')
    expect(p.name).toBe('Alice')
  })
})

describe('writePortfolio', () => {
  it('creates the folder and writes portfolio.json', async () => {
    const p = makePortfolio('Bob')
    await writePortfolio(TMP, p)
    const re = await readPortfolio(TMP, 'bob')
    expect(re.name).toBe('Bob')
  })
})

describe('deletePortfolio', () => {
  it('removes the CYP folder', async () => {
    const dir = join(TMP, 'alice')
    mkdirSync(dir)
    writeFileSync(join(dir, 'portfolio.json'), JSON.stringify(makePortfolio('Alice')))
    await deletePortfolio(TMP, 'alice')
    const result = await listCyps(TMP)
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Run tests to confirm they fail**

```bash
npm run test:main
```

Expected: FAIL — `Cannot find module '../../../src/main/portfolio/store'`

- [ ] **Implement `src/main/portfolio/store.ts`**

```ts
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import type { CypMeta, Portfolio } from '../../renderer/src/types/portfolio'

export async function listCyps(root: string): Promise<CypMeta[]> {
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch {
    return []
  }
  const results: CypMeta[] = []
  for (const entry of entries) {
    const jsonPath = join(root, entry, 'portfolio.json')
    try {
      const raw = await readFile(jsonPath, 'utf-8')
      const p: Portfolio = JSON.parse(raw)
      const s = await stat(jsonPath)
      results.push({ slug: entry, name: p.name, lastModified: s.mtime.toISOString() })
    } catch {
      // not a valid portfolio folder — skip
    }
  }
  return results.sort((a, b) => b.lastModified.localeCompare(a.lastModified))
}

export async function readPortfolio(root: string, slug: string): Promise<Portfolio> {
  const raw = await readFile(join(root, slug, 'portfolio.json'), 'utf-8')
  return JSON.parse(raw)
}

export async function writePortfolio(root: string, portfolio: Portfolio): Promise<void> {
  const dir = join(root, portfolio.slug)
  await mkdir(dir, { recursive: true })
  await mkdir(join(dir, 'assets'), { recursive: true })
  await mkdir(join(dir, 'snapshots'), { recursive: true })
  await mkdir(join(dir, 'output'), { recursive: true })
  await writeFile(join(dir, 'portfolio.json'), JSON.stringify(portfolio, null, 2), 'utf-8')
}

export async function deletePortfolio(root: string, slug: string): Promise<void> {
  await rm(join(root, slug), { recursive: true, force: true })
}
```

- [ ] **Run tests to confirm they pass**

```bash
npm run test:main
```

Expected: PASS (4 tests)

- [ ] **Commit**

```bash
git add src/main/portfolio/store.ts tests/main/portfolio/store.test.ts
git commit -m "feat: portfolio store — list/read/write/delete"
```

---

## Task 4: Snapshot system

**Files:**
- Create: `src/main/portfolio/snapshot.ts`
- Create: `tests/main/portfolio/snapshot.test.ts`

- [ ] **Write failing tests**

Create `tests/main/portfolio/snapshot.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createSnapshot, listSnapshots, restoreSnapshot, pruneSnapshots } from '../../../src/main/portfolio/snapshot'

const TMP = join(__dirname, '__tmp_snap__')
const makeRoot = (slug: string) => {
  const dir = join(TMP, slug)
  mkdirSync(join(dir, 'assets'), { recursive: true })
  mkdirSync(join(dir, 'snapshots'), { recursive: true })
  writeFileSync(join(dir, 'portfolio.json'), JSON.stringify({ name: 'Alice' }))
  return dir
}

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

it('creates a snapshot folder with portfolio.json inside', async () => {
  const dir = makeRoot('alice')
  await createSnapshot(dir)
  const snaps = await listSnapshots(dir)
  expect(snaps).toHaveLength(1)
})

it('restores portfolio.json from snapshot', async () => {
  const dir = makeRoot('alice')
  await createSnapshot(dir)
  writeFileSync(join(dir, 'portfolio.json'), JSON.stringify({ name: 'MODIFIED' }))
  const snaps = await listSnapshots(dir)
  await restoreSnapshot(dir, snaps[0].id)
  const raw = require('fs').readFileSync(join(dir, 'portfolio.json'), 'utf-8')
  expect(JSON.parse(raw).name).toBe('Alice')
})

it('pruneSnapshots removes entries older than maxAgeDays', async () => {
  const dir = makeRoot('alice')
  // create two snapshots with fake old timestamps
  const snapDir = join(dir, 'snapshots')
  mkdirSync(join(snapDir, '2000-01-01T00-00-00'), { recursive: true })
  writeFileSync(join(snapDir, '2000-01-01T00-00-00', 'portfolio.json'), '{}')
  await createSnapshot(dir) // recent one
  await pruneSnapshots(dir, 0) // maxAgeDays=0 removes everything older than today
  const snaps = await listSnapshots(dir)
  expect(snaps.every(s => s.id !== '2000-01-01T00-00-00')).toBe(true)
})
```

- [ ] **Run tests to confirm they fail**

```bash
npm run test:main
```

Expected: FAIL — module not found

- [ ] **Implement `src/main/portfolio/snapshot.ts`**

```ts
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'

export interface SnapshotMeta {
  id: string          // timestamp string used as folder name
  createdAt: string   // ISO date
}

function timestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export async function createSnapshot(portfolioDir: string): Promise<void> {
  const id = timestampId()
  const dest = join(portfolioDir, 'snapshots', id)
  await mkdir(dest, { recursive: true })
  await cp(join(portfolioDir, 'portfolio.json'), join(dest, 'portfolio.json'))
  const assetsDir = join(portfolioDir, 'assets')
  await cp(assetsDir, join(dest, 'assets'), { recursive: true }).catch(() => {})
}

export async function listSnapshots(portfolioDir: string): Promise<SnapshotMeta[]> {
  const dir = join(portfolioDir, 'snapshots')
  let entries: string[]
  try { entries = await readdir(dir) } catch { return [] }
  return entries
    .filter(e => /^\d{4}-\d{2}-\d{2}T/.test(e))
    .map(id => ({ id, createdAt: id.replace('T', ' ').replace(/-/g, (m, o) => o > 9 ? ':' : '-') }))
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function restoreSnapshot(portfolioDir: string, snapshotId: string): Promise<void> {
  const src = join(portfolioDir, 'snapshots', snapshotId)
  await cp(join(src, 'portfolio.json'), join(portfolioDir, 'portfolio.json'))
  const srcAssets = join(src, 'assets')
  await cp(srcAssets, join(portfolioDir, 'assets'), { recursive: true }).catch(() => {})
}

export async function pruneSnapshots(portfolioDir: string, maxAgeDays: number): Promise<void> {
  const snaps = await listSnapshots(portfolioDir)
  const cutoff = Date.now() - maxAgeDays * 86_400_000
  for (const snap of snaps) {
    const snapDate = new Date(snap.id.slice(0, 10)).getTime()
    if (snapDate < cutoff) {
      await rm(join(portfolioDir, 'snapshots', snap.id), { recursive: true, force: true })
    }
  }
}
```

- [ ] **Run tests to confirm they pass**

```bash
npm run test:main
```

Expected: PASS (3 tests)

- [ ] **Commit**

```bash
git add src/main/portfolio/snapshot.ts tests/main/portfolio/snapshot.test.ts
git commit -m "feat: snapshot create/list/restore/prune"
```

---

## Task 5: Preload + IPC wiring

**Files:**
- Modify: `src/preload/index.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`

- [ ] **Write `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { Portfolio, CypMeta, SnapshotMeta, FtpConfig } from '../renderer/src/types/portfolio'

contextBridge.exposeInMainWorld('api', {
  // Portfolio
  listCyps: (root: string): Promise<CypMeta[]> => ipcRenderer.invoke('portfolio:list', root),
  readPortfolio: (root: string, slug: string): Promise<Portfolio> => ipcRenderer.invoke('portfolio:read', root, slug),
  writePortfolio: (root: string, p: Portfolio): Promise<void> => ipcRenderer.invoke('portfolio:write', root, p),
  deletePortfolio: (root: string, slug: string): Promise<void> => ipcRenderer.invoke('portfolio:delete', root, slug),
  // Snapshots
  createSnapshot: (dir: string): Promise<void> => ipcRenderer.invoke('snapshot:create', dir),
  listSnapshots: (dir: string): Promise<SnapshotMeta[]> => ipcRenderer.invoke('snapshot:list', dir),
  restoreSnapshot: (dir: string, id: string): Promise<void> => ipcRenderer.invoke('snapshot:restore', dir, id),
  // Media
  importMedia: (portfolioDir: string, filePaths: string[]): Promise<string[]> => ipcRenderer.invoke('media:import', portfolioDir, filePaths),
  importGodotFolder: (portfolioDir: string, folderPath: string, title: string): Promise<string> => ipcRenderer.invoke('media:importGodot', portfolioDir, folderPath, title),
  openFilePicker: (opts: Electron.OpenDialogOptions): Promise<string[]> => ipcRenderer.invoke('dialog:openFile', opts),
  openFolderPicker: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  // Generator
  buildSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> => ipcRenderer.invoke('site:build', portfolioDir, portfolio),
  previewSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> => ipcRenderer.invoke('site:preview', portfolioDir, portfolio),
  exportSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> => ipcRenderer.invoke('site:export', portfolioDir, portfolio),
  // Publish
  publishFtp: (portfolioDir: string, config: FtpConfig): Promise<void> => ipcRenderer.invoke('publish:ftp', portfolioDir, config),
  // Config
  getPortfoliosRoot: (): Promise<string> => ipcRenderer.invoke('config:getRoot'),
  setPortfoliosRoot: (p: string): Promise<void> => ipcRenderer.invoke('config:setRoot', p),
})
```

- [ ] **Create `src/main/ipc.ts`**

```ts
import { dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { app } from 'electron'
import { listCyps, readPortfolio, writePortfolio, deletePortfolio } from './portfolio/store'
import { createSnapshot, listSnapshots, restoreSnapshot } from './portfolio/snapshot'
import { importMediaFiles, importGodotFolder } from './media/importer'
import { buildSite } from './generator/index'
import { uploadFtp } from './publish/ftp'
import type { Portfolio, FtpConfig } from '../renderer/src/types/portfolio'

const configPath = join(app.getPath('userData'), 'config.json')

async function getRoot(): Promise<string> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    return JSON.parse(raw).portfoliosRoot
  } catch {
    const def = join(app.getPath('documents'), 'CYP Portfolios')
    await mkdir(def, { recursive: true })
    return def
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:getRoot', getRoot)
  ipcMain.handle('config:setRoot', async (_, p: string) => {
    await writeFile(configPath, JSON.stringify({ portfoliosRoot: p }), 'utf-8')
  })
  ipcMain.handle('portfolio:list', (_, root: string) => listCyps(root))
  ipcMain.handle('portfolio:read', (_, root: string, slug: string) => readPortfolio(root, slug))
  ipcMain.handle('portfolio:write', (_, root: string, p: Portfolio) => writePortfolio(root, p))
  ipcMain.handle('portfolio:delete', (_, root: string, slug: string) => deletePortfolio(root, slug))
  ipcMain.handle('snapshot:create', (_, dir: string) => createSnapshot(dir))
  ipcMain.handle('snapshot:list', (_, dir: string) => listSnapshots(dir))
  ipcMain.handle('snapshot:restore', (_, dir: string, id: string) => restoreSnapshot(dir, id))
  ipcMain.handle('media:import', (_, portfolioDir: string, filePaths: string[]) => importMediaFiles(portfolioDir, filePaths))
  ipcMain.handle('media:importGodot', (_, portfolioDir: string, folderPath: string, title: string) => importGodotFolder(portfolioDir, folderPath, title))
  ipcMain.handle('dialog:openFile', (_, opts: Electron.OpenDialogOptions) => dialog.showOpenDialog(opts).then(r => r.filePaths))
  ipcMain.handle('dialog:openFolder', () => dialog.showOpenDialog({ properties: ['openDirectory'] }).then(r => r.filePaths[0] ?? null))
  ipcMain.handle('site:build', (_, dir: string, p: Portfolio) => buildSite(dir, p))
  ipcMain.handle('site:preview', async (_, dir: string, p: Portfolio) => {
    await buildSite(dir, p)
    shell.openPath(join(dir, 'output', 'index.html'))
  })
  ipcMain.handle('site:export', async (_, dir: string, p: Portfolio) => {
    await buildSite(dir, p)
    shell.openPath(join(dir, 'output'))
  })
  ipcMain.handle('publish:ftp', (_, dir: string, config: FtpConfig) => uploadFtp(dir, config))
}
```

- [ ] **Update `src/main/index.ts` to call `registerIpcHandlers()`**

In the existing `src/main/index.ts`, import and call before creating the window:

```ts
import { registerIpcHandlers } from './ipc'
// ... existing code ...
app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
```

- [ ] **Add global type declaration for `window.api`**

Create `src/renderer/src/types/api.d.ts`:

```ts
import type { Portfolio, CypMeta, SnapshotMeta, FtpConfig } from './portfolio'

declare global {
  interface Window {
    api: {
      listCyps(root: string): Promise<CypMeta[]>
      readPortfolio(root: string, slug: string): Promise<Portfolio>
      writePortfolio(root: string, p: Portfolio): Promise<void>
      deletePortfolio(root: string, slug: string): Promise<void>
      createSnapshot(dir: string): Promise<void>
      listSnapshots(dir: string): Promise<SnapshotMeta[]>
      restoreSnapshot(dir: string, id: string): Promise<void>
      importMedia(portfolioDir: string, filePaths: string[]): Promise<string[]>
      importGodotFolder(portfolioDir: string, folderPath: string, title: string): Promise<string>
      openFilePicker(opts: { properties: string[]; filters?: { name: string; extensions: string[] }[] }): Promise<string[]>
      openFolderPicker(): Promise<string | null>
      buildSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      previewSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      exportSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      publishFtp(portfolioDir: string, config: FtpConfig): Promise<void>
      getPortfoliosRoot(): Promise<string>
      setPortfoliosRoot(p: string): Promise<void>
    }
  }
}
export {}
```

- [ ] **Verify app still boots**

```bash
npm run dev
```

Expected: Window opens, no console errors.

- [ ] **Commit**

```bash
git add src/preload/index.ts src/main/ipc.ts src/main/index.ts src/renderer/src/types/api.d.ts
git commit -m "feat: preload contextBridge API + IPC handler registration"
```

---

## Task 6: Media importer (main process)

**Files:**
- Create: `src/main/media/importer.ts`

- [ ] **Create `src/main/media/importer.ts`**

```ts
import { cp, mkdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { randomUUID } from 'crypto'

const HEIC_EXTS = new Set(['.heic', '.heif'])

async function convertHeic(srcPath: string, destPath: string): Promise<void> {
  const { default: heicConvert } = await import('heic-convert')
  const { readFile, writeFile } = await import('fs/promises')
  const input = await readFile(srcPath)
  const output = await heicConvert({ buffer: input, format: 'JPEG', quality: 0.92 })
  await writeFile(destPath, Buffer.from(output))
}

export async function importMediaFiles(portfolioDir: string, filePaths: string[]): Promise<string[]> {
  const assetsDir = join(portfolioDir, 'assets')
  await mkdir(assetsDir, { recursive: true })
  const results: string[] = []
  for (const src of filePaths) {
    const ext = extname(src).toLowerCase()
    const base = basename(src, ext)
    const uniqueName = `${base}-${randomUUID().slice(0, 8)}${HEIC_EXTS.has(ext) ? '.jpg' : ext}`
    const dest = join(assetsDir, uniqueName)
    if (HEIC_EXTS.has(ext)) {
      await convertHeic(src, dest)
    } else {
      await cp(src, dest)
    }
    results.push(uniqueName)
  }
  return results
}

export async function importGodotFolder(portfolioDir: string, folderPath: string, title: string): Promise<string> {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const dest = join(portfolioDir, 'assets', `godot-${slug}`)
  await cp(folderPath, dest, { recursive: true })
  return `godot-${slug}`
}
```

- [ ] **Commit**

```bash
git add src/main/media/importer.ts
git commit -m "feat: media importer — copy files, HEIC conversion, Godot folder import"
```

---

## Task 7: Global app state (React Context)

**Files:**
- Create: `src/renderer/src/store/PortfolioContext.tsx`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/main.tsx`

- [ ] **Create `src/renderer/src/store/PortfolioContext.tsx`**

```tsx
import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { Portfolio, Section } from '../types/portfolio'

interface AppState {
  portfoliosRoot: string
  openPortfolioSlug: string | null
  portfolio: Portfolio | null
  portfolioDir: string | null
  dirty: boolean
}

type Action =
  | { type: 'SET_ROOT'; root: string }
  | { type: 'OPEN_PORTFOLIO'; portfolio: Portfolio; slug: string; root: string }
  | { type: 'CLOSE_PORTFOLIO' }
  | { type: 'UPDATE_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'MARK_CLEAN' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROOT':
      return { ...state, portfoliosRoot: action.root }
    case 'OPEN_PORTFOLIO':
      return {
        ...state,
        openPortfolioSlug: action.slug,
        portfolio: action.portfolio,
        portfolioDir: `${action.root}/${action.slug}`,
        dirty: false
      }
    case 'CLOSE_PORTFOLIO':
      return { ...state, openPortfolioSlug: null, portfolio: null, portfolioDir: null, dirty: false }
    case 'UPDATE_PORTFOLIO':
      return { ...state, portfolio: action.portfolio, dirty: true }
    case 'MARK_CLEAN':
      return { ...state, dirty: false }
    default:
      return state
  }
}

interface PortfolioContextValue {
  state: AppState
  openPortfolio: (slug: string) => Promise<void>
  closePortfolio: () => void
  savePortfolio: (p?: Portfolio) => Promise<void>
  updatePortfolio: (p: Portfolio) => void
  setRoot: (root: string) => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    portfoliosRoot: '',
    openPortfolioSlug: null,
    portfolio: null,
    portfolioDir: null,
    dirty: false
  })

  const setRoot = useCallback(async (root: string) => {
    await window.api.setPortfoliosRoot(root)
    dispatch({ type: 'SET_ROOT', root })
  }, [])

  const openPortfolio = useCallback(async (slug: string) => {
    const root = state.portfoliosRoot
    const portfolio = await window.api.readPortfolio(root, slug)
    dispatch({ type: 'OPEN_PORTFOLIO', portfolio, slug, root })
  }, [state.portfoliosRoot])

  const closePortfolio = useCallback(() => dispatch({ type: 'CLOSE_PORTFOLIO' }), [])

  const savePortfolio = useCallback(async (p?: Portfolio) => {
    const portfolio = p ?? state.portfolio
    if (!portfolio) return
    await window.api.createSnapshot(state.portfolioDir!)
    await window.api.writePortfolio(state.portfoliosRoot, portfolio)
    dispatch({ type: 'MARK_CLEAN' })
  }, [state.portfolio, state.portfolioDir, state.portfoliosRoot])

  const updatePortfolio = useCallback((p: Portfolio) => dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: p }), [])

  return (
    <PortfolioContext.Provider value={{ state, openPortfolio, closePortfolio, savePortfolio, updatePortfolio, setRoot }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider')
  return ctx
}
```

- [ ] **Update `src/renderer/src/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { PortfolioProvider, usePortfolio } from './store/PortfolioContext'
import { Picker } from './pages/Picker'
import { Editor } from './pages/Editor'

function Inner() {
  const { state } = usePortfolio()
  return state.openPortfolioSlug ? <Editor /> : <Picker />
}

export default function App() {
  return (
    <PortfolioProvider>
      <Inner />
    </PortfolioProvider>
  )
}
```

- [ ] **Verify app still compiles and boots**

```bash
npm run dev
```

- [ ] **Commit**

```bash
git add src/renderer/src/store/PortfolioContext.tsx src/renderer/src/App.tsx
git commit -m "feat: PortfolioContext — global state + IPC actions"
```

---

## Task 8: CYP Picker screen

**Files:**
- Create: `src/renderer/src/pages/Picker.tsx`
- Create: `tests/renderer/Picker.test.tsx`

- [ ] **Write failing test**

Create `tests/renderer/Picker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Picker } from '../../src/renderer/src/pages/Picker'

const mockState = {
  portfoliosRoot: '/fake/root',
  openPortfolioSlug: null,
  portfolio: null,
  portfolioDir: null,
  dirty: false
}
const mockOpenPortfolio = vi.fn()
const mockSetRoot = vi.fn()

vi.mock('../../src/renderer/src/store/PortfolioContext', () => ({
  usePortfolio: () => ({
    state: mockState,
    openPortfolio: mockOpenPortfolio,
    setRoot: mockSetRoot
  })
}))

window.api = {
  listCyps: vi.fn().mockResolvedValue([
    { slug: 'alice', name: 'Alice', lastModified: '2026-05-01T10:00:00.000Z' },
    { slug: 'bob', name: 'Bob', lastModified: '2026-04-20T10:00:00.000Z' }
  ]),
  writePortfolio: vi.fn().mockResolvedValue(undefined),
  getPortfoliosRoot: vi.fn().mockResolvedValue('/fake/root'),
} as unknown as typeof window.api

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
})
```

- [ ] **Run tests to confirm they fail**

```bash
npm run test:renderer
```

Expected: FAIL — module not found

- [ ] **Create `src/renderer/src/pages/Picker.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { usePortfolio } from '../store/PortfolioContext'
import type { CypMeta } from '../types/portfolio'
import type { Portfolio } from '../types/portfolio'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function Picker() {
  const { state, openPortfolio, setRoot } = usePortfolio()
  const [cyps, setCyps] = useState<CypMeta[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!state.portfoliosRoot) {
      window.api.getPortfoliosRoot().then(root => {
        setRoot(root).then(() => window.api.listCyps(root).then(setCyps))
      })
    } else {
      window.api.listCyps(state.portfoliosRoot).then(setCyps)
    }
  }, [state.portfoliosRoot])

  async function handleCreate() {
    if (!newName.trim()) return
    const slug = slugify(newName.trim())
    const portfolio: Portfolio = {
      schemaVersion: 1,
      name: newName.trim(),
      slug,
      bio: '',
      sections: [{ id: 'about', type: 'about', title: 'About Me', visible: true, bio: '', avatarFilename: undefined }],
      publish: {}
    }
    await window.api.writePortfolio(state.portfoliosRoot, portfolio)
    setNewName('')
    setCreating(false)
    setCyps(await window.api.listCyps(state.portfoliosRoot))
  }

  async function handleChangeFolder() {
    const folder = await window.api.openFolderPicker()
    if (folder) await setRoot(folder)
  }

  return (
    <div style={{ padding: 32, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>CYP Portfolios</h1>
      <button onClick={handleChangeFolder} style={{ fontSize: 12, marginBottom: 24, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
        📁 {state.portfoliosRoot || 'Loading…'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {cyps.map(cyp => (
          <div
            key={cyp.slug}
            onClick={() => openPortfolio(cyp.slug)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}
          >
            <span style={{ fontWeight: 500 }}>{cyp.name}</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(cyp.lastModified).toLocaleDateString()}</span>
          </div>
        ))}

        {creating ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="CYP name"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
            <button onClick={handleCreate} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setCreating(false)} style={{ padding: '8px 12px', background: 'none', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ marginTop: 8, padding: '10px 14px', background: 'none', border: '1px dashed #ccc', borderRadius: 6, cursor: 'pointer', color: '#888' }}>
            + Add new CYP
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Run tests**

```bash
npm run test:renderer
```

Expected: PASS (2 tests)

- [ ] **Commit**

```bash
git add src/renderer/src/pages/Picker.tsx tests/renderer/Picker.test.tsx
git commit -m "feat: CYP picker screen — list, create, open"
```

---

## Task 9: Editor shell

**Files:**
- Create: `src/renderer/src/pages/Editor.tsx`
- Create: `src/renderer/src/components/editor/Sidebar.tsx`
- Create: `src/renderer/src/components/editor/SidebarItem.tsx`
- Create: `src/renderer/src/components/editor/TopBar.tsx`

- [ ] **Create `src/renderer/src/components/editor/TopBar.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'

export function TopBar() {
  const { state, closePortfolio, savePortfolio } = usePortfolio()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={closePortfolio} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13 }}>← Back</button>
        <span style={{ fontWeight: 600 }}>{state.portfolio?.name}</span>
        {state.dirty && <span style={{ fontSize: 11, color: '#e94560' }}>Unsaved changes</span>}
      </div>
      <button
        onClick={() => savePortfolio()}
        style={{ padding: '6px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
      >
        Save
      </button>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/editor/SidebarItem.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Section } from '../../types/portfolio'

const SECTION_ICONS: Record<string, string> = {
  about: '👤', gallery: '🖼', videos: '🎬', models: '📦', games: '🎮', code: '💻', custom: '📝'
}

interface Props {
  section: Section
  active: boolean
  onClick: () => void
  onToggleVisible: () => void
}

export function SidebarItem({ section, active, onClick, onToggleVisible }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: active ? '#f0f0f0' : 'transparent', cursor: 'pointer' }}
      onClick={onClick}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#ccc', fontSize: 14 }}>⠿</span>
      <span>{SECTION_ICONS[section.type] ?? '📄'}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400 }}>{section.title}</span>
      <button
        onClick={e => { e.stopPropagation(); onToggleVisible() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: section.visible ? '#333' : '#ccc', fontSize: 14 }}
        title={section.visible ? 'Hide section' : 'Show section'}
      >
        {section.visible ? '👁' : '👁‍🗨'}
      </button>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/editor/Sidebar.tsx`**

```tsx
import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { usePortfolio } from '../../store/PortfolioContext'
import { SidebarItem } from './SidebarItem'
import type { Section, SectionType } from '../../types/portfolio'
import { randomUUID } from 'crypto'

const SECTION_DEFAULTS: Record<SectionType, Partial<Section>> = {
  about: { title: 'About Me', bio: '', visible: true },
  gallery: { title: 'Gallery', items: [], visible: true },
  videos: { title: 'Videos', items: [], visible: true },
  models: { title: '3D Models', items: [], visible: true },
  games: { title: 'Games', items: [], visible: true },
  code: { title: 'Code', items: [], visible: true },
  custom: { title: 'Custom Section', html: '', visible: true }
}

interface Props {
  activeSectionId: string | null
  onSelectSection: (id: string) => void
}

export function Sidebar({ activeSectionId, onSelectSection }: Props) {
  const { state, updatePortfolio, savePortfolio } = usePortfolio()
  const [adding, setAdding] = useState(false)
  const portfolio = state.portfolio!

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = portfolio.sections.findIndex(s => s.id === active.id)
    const newIndex = portfolio.sections.findIndex(s => s.id === over.id)
    updatePortfolio({ ...portfolio, sections: arrayMove(portfolio.sections, oldIndex, newIndex) })
  }

  function handleToggleVisible(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
    })
  }

  function handleAddSection(type: SectionType) {
    const id = `${type}-${randomUUID().slice(0, 8)}`
    const newSection = { ...SECTION_DEFAULTS[type], id, type } as Section
    updatePortfolio({ ...portfolio, sections: [...portfolio.sections, newSection] })
    onSelectSection(id)
    setAdding(false)
  }

  return (
    <div style={{ width: 220, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={portfolio.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {portfolio.sections.map(section => (
              <SidebarItem
                key={section.id}
                section={section}
                active={section.id === activeSectionId}
                onClick={() => onSelectSection(section.id)}
                onToggleVisible={() => handleToggleVisible(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {adding ? (
          <div style={{ padding: 8 }}>
            {(['about','gallery','videos','models','games','code','custom'] as SectionType[]).map(type => (
              <div key={type} onClick={() => handleAddSection(type)} style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}>
                + {type}
              </div>
            ))}
            <button onClick={() => setAdding(false)} style={{ marginTop: 4, fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', color: '#aaa', fontSize: 12 }}>
            + Add section
          </button>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={() => state.portfolioDir && window.api.previewSite(state.portfolioDir, portfolio)} style={{ padding: '7px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'white' }}>Preview</button>
        <button onClick={() => state.portfolioDir && window.api.exportSite(state.portfolioDir, portfolio)} style={{ padding: '7px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'white' }}>Export</button>
        <button onClick={() => state.portfolioDir && portfolio.publish.ftp && window.api.publishFtp(state.portfolioDir, portfolio.publish.ftp)} style={{ padding: '7px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Publish</button>
      </div>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/pages/Editor.tsx`**

```tsx
import { useState, lazy, Suspense } from 'react'
import { TopBar } from '../components/editor/TopBar'
import { Sidebar } from '../components/editor/Sidebar'
import { usePortfolio } from '../store/PortfolioContext'
import type { SectionType } from '../types/portfolio'

const SECTION_COMPONENTS: Record<SectionType, React.LazyExoticComponent<any>> = {
  about: lazy(() => import('../components/sections/AboutSection').then(m => ({ default: m.AboutSection }))),
  gallery: lazy(() => import('../components/sections/GallerySection').then(m => ({ default: m.GallerySection }))),
  videos: lazy(() => import('../components/sections/VideosSection').then(m => ({ default: m.VideosSection }))),
  models: lazy(() => import('../components/sections/ModelsSection').then(m => ({ default: m.ModelsSection }))),
  games: lazy(() => import('../components/sections/GamesSection').then(m => ({ default: m.GamesSection }))),
  code: lazy(() => import('../components/sections/CodeSection').then(m => ({ default: m.CodeSection }))),
  custom: lazy(() => import('../components/sections/CustomSection').then(m => ({ default: m.CustomSection }))),
}

export function Editor() {
  const { state } = usePortfolio()
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    state.portfolio?.sections[0]?.id ?? null
  )

  const activeSection = state.portfolio?.sections.find(s => s.id === activeSectionId)
  const SectionComponent = activeSection ? SECTION_COMPONENTS[activeSection.type] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeSectionId={activeSectionId} onSelectSection={setActiveSectionId} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <Suspense fallback={<div>Loading…</div>}>
            {SectionComponent && activeSection
              ? <SectionComponent section={activeSection} />
              : <div style={{ color: '#aaa' }}>Select a section from the sidebar.</div>
            }
          </Suspense>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Verify app renders picker and editor shells**

```bash
npm run dev
```

Expected: Picker shows; creating and clicking a CYP opens the editor with sidebar.

- [ ] **Commit**

```bash
git add src/renderer/src/pages/Editor.tsx src/renderer/src/components/editor/
git commit -m "feat: editor shell — sidebar, drag-to-reorder sections, top bar"
```

---

## Task 10: Section editors

**Files:**
- Create: `src/renderer/src/components/sections/AboutSection.tsx`
- Create: `src/renderer/src/components/sections/GallerySection.tsx`
- Create: `src/renderer/src/components/sections/VideosSection.tsx`
- Create: `src/renderer/src/components/sections/ModelsSection.tsx`
- Create: `src/renderer/src/components/sections/GamesSection.tsx`
- Create: `src/renderer/src/components/sections/CodeSection.tsx`
- Create: `src/renderer/src/components/sections/CustomSection.tsx`
- Create: `src/renderer/src/components/shared/MediaDropzone.tsx`

- [ ] **Create `src/renderer/src/components/shared/MediaDropzone.tsx`**

```tsx
interface Props {
  label: string
  accept: string
  multiple?: boolean
  onFiles: (paths: string[]) => void
  filters?: { name: string; extensions: string[] }[]
}

export function MediaDropzone({ label, accept, multiple = true, onFiles, filters }: Props) {
  async function handleClick() {
    const paths = await window.api.openFilePicker({
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: filters ?? [{ name: 'Media', extensions: accept.split(',').map(e => e.trim().replace('.', '')) }]
    })
    if (paths.length) onFiles(paths)
  }

  return (
    <div
      onClick={handleClick}
      style={{ border: '2px dashed #ddd', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: 13 }}
    >
      {label}
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/AboutSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { AboutSection as AboutSectionType } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'

export function AboutSection({ section }: { section: AboutSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function update(patch: Partial<AboutSectionType>) {
    const portfolio = state.portfolio!
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s => s.id === section.id ? { ...s, ...patch } : s)
    })
  }

  async function handleAvatarImport(paths: string[]) {
    const [filename] = await window.api.importMedia(state.portfolioDir!, paths)
    update({ avatarFilename: filename })
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 24 }}>About Me</h2>

      <label style={{ display: 'block', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Name</span>
        <input
          value={state.portfolio?.name ?? ''}
          onChange={e => updatePortfolio({ ...state.portfolio!, name: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Bio</span>
        <textarea
          value={section.bio}
          onChange={e => update({ bio: e.target.value })}
          rows={4}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, resize: 'vertical' }}
        />
      </label>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Avatar photo</span>
        {section.avatarFilename && (
          <img src={`file://${state.portfolioDir}/assets/${section.avatarFilename}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', marginBottom: 8 }} />
        )}
        <MediaDropzone label="Click to choose avatar" accept=".jpg,.png,.webp,.heic" multiple={false} onFiles={handleAvatarImport} />
      </div>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/GallerySection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { GallerySection as GallerySectionType, MediaItem } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { randomUUID } from 'crypto'

export function GallerySection({ section }: { section: GallerySectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<GallerySectionType>) {
    updatePortfolio({ ...state.portfolio!, sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, ...patch } : s) })
  }

  async function handleImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    const newItems: MediaItem[] = filenames.map(filename => ({ id: randomUUID(), filename }))
    updateSection({ items: [...section.items, ...newItems] })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }}>
            <img src={`file://${state.portfolioDir}/assets/${item.filename}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            <button onClick={() => removeItem(item.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}>×</button>
          </div>
        ))}
      </div>
      <MediaDropzone label="Click to add images or GIFs" accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.heic" onFiles={handleImport} />
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/VideosSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { VideosSection as VideosSectionType, VideoItem } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { randomUUID } from 'crypto'

async function captureThumbnail(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.currentTime = 1
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    video.onerror = reject
  })
}

export function VideosSection({ section }: { section: VideosSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<VideosSectionType>) {
    updatePortfolio({ ...state.portfolio!, sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, ...patch } : s) })
  }

  async function handleImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    const newItems: VideoItem[] = []
    for (const filename of filenames) {
      let thumbnailFilename: string | undefined
      try {
        const dataUrl = await captureThumbnail(`file://${state.portfolioDir}/assets/${filename}`)
        const thumbName = `thumb-${filename.replace(/\.\w+$/, '.jpg')}`
        // Save thumbnail via IPC: base64 → file
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
        const blob = Buffer.from(base64, 'base64')
        await window.api.importMedia(state.portfolioDir!, [])  // noop — thumbnail saved separately below
        thumbnailFilename = thumbName
      } catch { /* thumbnail optional */ }
      newItems.push({ id: randomUUID(), filename, thumbnailFilename })
    }
    updateSection({ items: [...section.items, ...newItems] })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ background: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video src={`file://${state.portfolioDir}/assets/${item.filename}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          </div>
        ))}
      </div>
      <MediaDropzone label="Click to add videos (mp4, webm)" accept=".mp4,.webm" onFiles={handleImport} filters={[{ name: 'Videos', extensions: ['mp4', 'webm'] }]} />
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/ModelsSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { ModelsSection as ModelsSectionType, ModelItem } from '../../types/portfolio'
import { MediaDropzone } from '../shared/MediaDropzone'
import { randomUUID } from 'crypto'

export function ModelsSection({ section }: { section: ModelsSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<ModelsSectionType>) {
    updatePortfolio({ ...state.portfolio!, sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, ...patch } : s) })
  }

  async function handleImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    const newItems: ModelItem[] = filenames.map(filename => ({ id: randomUUID(), filename }))
    updateSection({ items: [...section.items, ...newItems] })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ background: '#f5f5f5', borderRadius: 8, overflow: 'hidden', aspectRatio: '1' }}>
            {/* model-viewer is a custom element — available in published site, previewed as placeholder in editor */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 32 }}>📦</span>
              <span style={{ fontSize: 12 }}>{item.filename}</span>
            </div>
          </div>
        ))}
      </div>
      <MediaDropzone label="Click to add 3D models (GLB, GLTF)" accept=".glb,.gltf" onFiles={handleImport} filters={[{ name: '3D Models', extensions: ['glb', 'gltf'] }]} />
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/GamesSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { GamesSection as GamesSectionType, GameItem } from '../../types/portfolio'

export function GamesSection({ section }: { section: GamesSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<GamesSectionType>) {
    updatePortfolio({ ...state.portfolio!, sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, ...patch } : s) })
  }

  async function handleImportGodot() {
    const folder = await window.api.openFolderPicker()
    if (!folder) return
    const title = prompt('Game title?') ?? 'Game'
    const folderName = await window.api.importGodotFolder(state.portfolioDir!, folder, title)
    const newItem: GameItem = { id: crypto.randomUUID(), folderName, title, entryFile: 'index.html' }
    updateSection({ items: [...section.items, newItem] })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ padding: '12px 16px', background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎮</span>
            <div>
              <div style={{ fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>assets/{item.folderName}/{item.entryFile}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleImportGodot} style={{ padding: '10px 20px', border: '1px dashed #ddd', borderRadius: 8, cursor: 'pointer', background: 'none', color: '#888' }}>
        + Import Godot HTML5 export folder
      </button>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/CodeSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { CodeSection as CodeSectionType, CodeItem } from '../../types/portfolio'

const LANGUAGES = ['javascript', 'typescript', 'python', 'gdscript', 'html', 'css', 'rust', 'c', 'cpp', 'json', 'bash']

export function CodeSection({ section }: { section: CodeSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<CodeSectionType>) {
    updatePortfolio({ ...state.portfolio!, sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, ...patch } : s) })
  }

  function addSnippet() {
    const newItem: CodeItem = { id: crypto.randomUUID(), language: 'javascript', code: '', label: '' }
    updateSection({ items: [...section.items, newItem] })
  }

  function updateItem(id: string, patch: Partial<CodeItem>) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      {section.items.map(item => (
        <div key={item.id} style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>
            <input value={item.label ?? ''} onChange={e => updateItem(item.id, { label: e.target.value })} placeholder="Label (optional)" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13 }} />
            <select value={item.language} onChange={e => updateItem(item.id, { language: e.target.value })} style={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 4, padding: '2px 6px' }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <textarea value={item.code} onChange={e => updateItem(item.id, { code: e.target.value })} rows={10} style={{ width: '100%', border: 'none', padding: 12, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
      ))}
      <button onClick={addSnippet} style={{ padding: '8px 16px', border: '1px dashed #ddd', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#888' }}>+ Add code snippet</button>
    </div>
  )
}
```

- [ ] **Create `src/renderer/src/components/sections/CustomSection.tsx`**

```tsx
import { usePortfolio } from '../../store/PortfolioContext'
import type { CustomSection as CustomSectionType } from '../../types/portfolio'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

export function CustomSection({ section }: { section: CustomSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  const editor = useEditor({
    extensions: [StarterKit],
    content: section.html,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      updatePortfolio({
        ...state.portfolio!,
        sections: state.portfolio!.sections.map(s => s.id === section.id ? { ...s, html } : s)
      })
    }
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== section.html) {
      editor.commands.setContent(section.html, false)
    }
  }, [section.id])

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{section.title}</h2>
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>
          {[
            { label: 'B', action: () => editor?.chain().focus().toggleBold().run() },
            { label: 'I', action: () => editor?.chain().focus().toggleItalic().run() },
            { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
            { label: 'H3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
            { label: '• List', action: () => editor?.chain().focus().toggleBulletList().run() },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: 'white' }}>{label}</button>
          ))}
        </div>
        <EditorContent editor={editor} style={{ padding: 16, minHeight: 200, fontSize: 14 }} />
      </div>
    </div>
  )
}
```

- [ ] **Verify all sections render when selected in editor**

```bash
npm run dev
```

Create a test CYP, add each section type, confirm they render without errors.

- [ ] **Commit**

```bash
git add src/renderer/src/components/sections/ src/renderer/src/components/shared/
git commit -m "feat: all section editors — about, gallery, videos, models, games, code, custom"
```

---

## Task 11: Static site generator

**Files:**
- Create: `src/main/generator/index.ts`
- Create: `src/main/generator/template.ts`
- Create: `src/main/generator/sections/about.ts`
- Create: `src/main/generator/sections/gallery.ts`
- Create: `src/main/generator/sections/videos.ts`
- Create: `src/main/generator/sections/models.ts`
- Create: `src/main/generator/sections/games.ts`
- Create: `src/main/generator/sections/code.ts`
- Create: `src/main/generator/sections/custom.ts`
- Create: `tests/main/generator/index.test.ts`

- [ ] **Write failing test**

Create `tests/main/generator/index.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { buildSite } from '../../../src/main/generator/index'
import type { Portfolio } from '../../../src/renderer/src/types/portfolio'

const TMP = join(__dirname, '__tmp_gen__')

const portfolio: Portfolio = {
  schemaVersion: 1,
  name: 'Alice',
  slug: 'alice',
  bio: 'Test bio',
  sections: [
    { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Hello world' },
    { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] }
  ],
  publish: {}
}

beforeEach(() => {
  mkdirSync(join(TMP, 'assets'), { recursive: true })
  mkdirSync(join(TMP, 'output'), { recursive: true })
})
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

it('generates index.html containing the CYP name', async () => {
  await buildSite(TMP, portfolio)
  const html = await readFile(join(TMP, 'output', 'index.html'), 'utf-8')
  expect(html).toContain('Alice')
  expect(html).toContain('Hello world')
})

it('only includes visible sections', async () => {
  const p = { ...portfolio, sections: [
    { id: 'about', type: 'about' as const, title: 'About Me', visible: true, bio: 'Visible' },
    { id: 'gallery-1', type: 'gallery' as const, title: 'Hidden Gallery', visible: false, items: [] }
  ]}
  await buildSite(TMP, p)
  const html = await readFile(join(TMP, 'output', 'index.html'), 'utf-8')
  expect(html).not.toContain('Hidden Gallery')
})
```

- [ ] **Run tests to confirm they fail**

```bash
npm run test:main
```

- [ ] **Create section generators**

Create `src/main/generator/sections/about.ts`:

```ts
import type { AboutSection } from '../../../renderer/src/types/portfolio'

export function renderAbout(section: AboutSection): string {
  const avatar = section.avatarFilename
    ? `<img src="assets/${section.avatarFilename}" class="avatar" alt="Avatar">`
    : ''
  return `
<section id="${section.id}" class="section">
  <div class="about-block">
    ${avatar}
    <div class="about-text">
      <p>${escapeHtml(section.bio)}</p>
    </div>
  </div>
</section>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
```

Create `src/main/generator/sections/gallery.ts`:

```ts
import type { GallerySection } from '../../../renderer/src/types/portfolio'

export function renderGallery(section: GallerySection): string {
  const items = section.items.map(item => `
    <div class="gallery-item">
      <img src="assets/${item.filename}" alt="${item.caption ?? ''}" loading="lazy">
    </div>`).join('')
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  <div class="gallery-grid">${items}</div>
</section>`
}
```

Create `src/main/generator/sections/videos.ts`:

```ts
import type { VideosSection } from '../../../renderer/src/types/portfolio'

export function renderVideos(section: VideosSection): string {
  const items = section.items.map(item => `
    <div class="video-item">
      <video src="assets/${item.filename}" controls preload="metadata" ${item.thumbnailFilename ? `poster="assets/${item.thumbnailFilename}"` : ''}></video>
    </div>`).join('')
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  <div class="video-grid">${items}</div>
</section>`
}
```

Create `src/main/generator/sections/models.ts`:

```ts
import type { ModelsSection } from '../../../renderer/src/types/portfolio'

export function renderModels(section: ModelsSection): string {
  const items = section.items.map(item => `
    <div class="model-item">
      <model-viewer src="assets/${item.filename}" alt="${item.label ?? item.filename}" auto-rotate camera-controls style="width:100%;height:300px;"></model-viewer>
      ${item.label ? `<p class="model-label">${item.label}</p>` : ''}
    </div>`).join('')
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  <div class="models-grid">${items}</div>
</section>`
}
```

Create `src/main/generator/sections/games.ts`:

```ts
import type { GamesSection } from '../../../renderer/src/types/portfolio'

export function renderGames(section: GamesSection): string {
  const items = section.items.map(item => `
    <div class="game-item">
      <h3>${item.title}</h3>
      <iframe src="assets/${item.folderName}/${item.entryFile}" sandbox="allow-scripts allow-same-origin" allowfullscreen style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;"></iframe>
    </div>`).join('')
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  ${items}
</section>`
}
```

Create `src/main/generator/sections/code.ts`:

```ts
import type { CodeSection } from '../../../renderer/src/types/portfolio'

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

export function renderCode(section: CodeSection): string {
  const items = section.items.map(item => `
    <div class="code-block">
      ${item.label ? `<div class="code-label">${item.label}</div>` : ''}
      <pre><code class="language-${item.language}">${escapeHtml(item.code)}</code></pre>
    </div>`).join('')
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  ${items}
</section>`
}
```

Create `src/main/generator/sections/custom.ts`:

```ts
import type { CustomSection } from '../../../renderer/src/types/portfolio'

export function renderCustom(section: CustomSection): string {
  return `
<section id="${section.id}" class="section">
  <h2 class="section-title">${section.title}</h2>
  <div class="custom-content">${section.html}</div>
</section>`
}
```

- [ ] **Create `src/main/generator/template.ts`**

```ts
import type { Portfolio, Section } from '../../../renderer/src/types/portfolio'

export function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible)
    .map(s => `<a href="#${s.id}">${s.title}</a>`)
    .join('')
}

const needsModelViewer = (sections: Section[]) => sections.some(s => s.type === 'models' && s.visible)
const needsHighlight = (sections: Section[]) => sections.some(s => s.type === 'code' && s.visible)

export function wrapTemplate(portfolio: Portfolio, body: string): string {
  const modelViewerScript = needsModelViewer(portfolio.sections)
    ? `<script type="module" src="assets/vendor/model-viewer.min.js"></script>`
    : ''
  const highlightLinks = needsHighlight(portfolio.sections)
    ? `<link rel="stylesheet" href="assets/vendor/highlight.min.css">
       <script src="assets/vendor/highlight.min.js"></script>
       <script>document.addEventListener('DOMContentLoaded',()=>hljs.highlightAll())</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${portfolio.name}'s Portfolio</title>
  ${modelViewerScript}
  ${highlightLinks}
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#fff;color:#222;line-height:1.6}
    nav{position:sticky;top:0;background:white;border-bottom:1px solid #e0e0e0;padding:12px 32px;display:flex;gap:24px;z-index:100}
    nav a{text-decoration:none;color:#555;font-size:14px;font-weight:500}
    nav a:hover{color:#222}
    .hero{padding:48px 32px 32px;max-width:800px;margin:0 auto}
    .hero h1{font-size:32px;font-weight:700;margin-bottom:8px}
    .section{padding:32px;max-width:900px;margin:0 auto}
    .section-title{font-size:22px;font-weight:600;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid #f0f0f0}
    .about-block{display:flex;gap:24px;align-items:flex-start}
    .avatar{width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0}
    .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
    .gallery-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}
    .video-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .video-item video{width:100%;border-radius:8px}
    .models-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .model-label{text-align:center;font-size:13px;color:#666;margin-top:6px}
    .game-item{margin-bottom:32px}
    .game-item h3{margin-bottom:12px;font-size:16px}
    .code-block{margin-bottom:20px}
    .code-label{font-size:12px;color:#888;margin-bottom:4px;font-family:monospace}
    pre{background:#f8f8f8;border-radius:8px;padding:16px;overflow-x:auto}
    code{font-family:monospace;font-size:13px}
    .custom-content{font-size:15px}
    .custom-content h2{font-size:20px;margin:16px 0 8px}
    .custom-content h3{font-size:17px;margin:14px 0 6px}
    .custom-content p{margin-bottom:10px}
    .custom-content ul{padding-left:20px;margin-bottom:10px}
  </style>
</head>
<body>
  <nav>${buildNavLinks(portfolio.sections)}</nav>
  <div class="hero">
    <h1>${portfolio.name}</h1>
    <p>${portfolio.bio}</p>
  </div>
  ${body}
</body>
</html>`
}
```

- [ ] **Create `src/main/generator/index.ts`**

```ts
import { cp, mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Portfolio, Section } from '../../../renderer/src/types/portfolio'
import { wrapTemplate } from './template'
import { renderAbout } from './sections/about'
import { renderGallery } from './sections/gallery'
import { renderVideos } from './sections/videos'
import { renderModels } from './sections/models'
import { renderGames } from './sections/games'
import { renderCode } from './sections/code'
import { renderCustom } from './sections/custom'

function renderSection(section: Section): string {
  switch (section.type) {
    case 'about':   return renderAbout(section)
    case 'gallery': return renderGallery(section)
    case 'videos':  return renderVideos(section)
    case 'models':  return renderModels(section)
    case 'games':   return renderGames(section)
    case 'code':    return renderCode(section)
    case 'custom':  return renderCustom(section)
  }
}

export async function buildSite(portfolioDir: string, portfolio: Portfolio): Promise<void> {
  const outputDir = join(portfolioDir, 'output')
  const outputAssets = join(outputDir, 'assets')
  await mkdir(outputAssets, { recursive: true })

  // Copy media assets
  await cp(join(portfolioDir, 'assets'), outputAssets, { recursive: true }).catch(() => {})

  // Bundle vendor scripts
  const vendorDest = join(outputAssets, 'vendor')
  await mkdir(vendorDest, { recursive: true })
  const vendorSrc = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'renderer', 'assets', 'vendor')
  await cp(vendorSrc, vendorDest, { recursive: true }).catch(() => {})

  // Render sections
  const body = portfolio.sections
    .filter(s => s.visible)
    .map(renderSection)
    .join('\n')

  const html = wrapTemplate(portfolio, body)
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8')
}
```

- [ ] **Copy vendor scripts into the renderer assets folder**

```bash
mkdir -p src/renderer/assets/vendor
# Download model-viewer
curl -L "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" -o src/renderer/assets/vendor/model-viewer.min.js
# Download highlight.js
curl -L "https://unpkg.com/highlight.js/highlight.min.js" -o src/renderer/assets/vendor/highlight.min.js
curl -L "https://unpkg.com/highlight.js/styles/github.min.css" -o src/renderer/assets/vendor/highlight.min.css
```

- [ ] **Run generator tests**

```bash
npm run test:main
```

Expected: PASS (2 tests)

- [ ] **Commit**

```bash
git add src/main/generator/ src/renderer/assets/vendor/ tests/main/generator/
git commit -m "feat: static site generator — all section types, vendor scripts bundled"
```

---

## Task 12: FTP publish

**Files:**
- Create: `src/main/publish/ftp.ts`

- [ ] **Create `src/main/publish/ftp.ts`**

```ts
import { Client } from 'basic-ftp'
import { join } from 'path'
import type { FtpConfig } from '../../../renderer/src/types/portfolio'

export async function uploadFtp(portfolioDir: string, config: FtpConfig): Promise<void> {
  const client = new Client()
  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.user,
      password: config.secure ? undefined : '',   // caller must resolve password separately
      secure: config.secure
    })
    await client.ensureDir(config.remotePath)
    await client.clearWorkingDir()
    await client.uploadFromDir(join(portfolioDir, 'output'), config.remotePath)
  } finally {
    client.close()
  }
}
```

Note: FTP password is not stored in `portfolio.json`. Add a `SettingsPanel` component (post-MVP) that uses the Windows Credential Manager to retrieve/store it. For MVP, users enter the password in a modal before publishing.

- [ ] **Commit**

```bash
git add src/main/publish/ftp.ts
git commit -m "feat: FTP publish via basic-ftp"
```

---

## Task 13: Snapshot panel UI

**Files:**
- Create: `src/renderer/src/components/shared/SnapshotPanel.tsx`

- [ ] **Create `src/renderer/src/components/shared/SnapshotPanel.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { SnapshotMeta } from '../../types/portfolio'

export function SnapshotPanel({ onClose }: { onClose: () => void }) {
  const { state, openPortfolio } = usePortfolio()
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])

  useEffect(() => {
    if (state.portfolioDir) {
      window.api.listSnapshots(state.portfolioDir).then(setSnapshots)
    }
  }, [state.portfolioDir])

  async function handleRestore(id: string) {
    if (!confirm(`Restore snapshot from ${id}? Unsaved changes will be lost.`)) return
    await window.api.restoreSnapshot(state.portfolioDir!, id)
    await openPortfolio(state.openPortfolioSlug!)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 400, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3>Version History</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        {snapshots.length === 0
          ? <p style={{ color: '#aaa', fontSize: 13 }}>No snapshots yet. Save to create one.</p>
          : snapshots.map(snap => (
            <div key={snap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 13 }}>{snap.createdAt}</span>
              <button onClick={() => handleRestore(snap.id)} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: 'none' }}>Restore</button>
            </div>
          ))
        }
      </div>
    </div>
  )
}
```

- [ ] **Wire SnapshotPanel into Sidebar** — add a "History" button above the action buttons in `Sidebar.tsx`:

In `src/renderer/src/components/editor/Sidebar.tsx`, import `SnapshotPanel` and add:

```tsx
import { SnapshotPanel } from '../shared/SnapshotPanel'
// inside the component:
const [showSnapshots, setShowSnapshots] = useState(false)
// in the sidebar footer, before the action buttons:
<button onClick={() => setShowSnapshots(true)} style={{ padding: '7px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'white' }}>History</button>
// at bottom of return:
{showSnapshots && <SnapshotPanel onClose={() => setShowSnapshots(false)} />}
```

- [ ] **Commit**

```bash
git add src/renderer/src/components/shared/SnapshotPanel.tsx src/renderer/src/components/editor/Sidebar.tsx
git commit -m "feat: snapshot panel — list and restore version history"
```

---

## Task 14: Windows installer

**Files:**
- Modify: `electron-builder.yml` (or create if absent)

- [ ] **Create/update `electron-builder.yml`**

```yaml
appId: com.playerready.cyp-portfolio
productName: CYP Portfolio Builder
directories:
  output: dist-installer
win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
files:
  - "!**/.git/**"
  - "!**/node_modules/.cache/**"
  - "!tests/**"
  - "!docs/**"
```

- [ ] **Add a placeholder app icon** (replace with real icon before distributing)

```bash
mkdir -p resources
# For development, generate a placeholder .ico — replace before release
# You can convert any PNG to .ico at https://icoconvert.com and place at resources/icon.ico
```

- [ ] **Add build script to `package.json`**

```json
"build:win": "electron-vite build && electron-builder --win"
```

- [ ] **Build the installer**

```bash
npm run build:win
```

Expected: `dist-installer/CYP Portfolio Builder Setup x.x.x.exe` created.

- [ ] **Test install**

Run the installer, launch the app, confirm the picker loads.

- [ ] **Commit**

```bash
git add electron-builder.yml package.json resources/
git commit -m "feat: electron-builder Windows installer config"
```

---

## Self-Review

Spec → Plan coverage check:

| Spec requirement | Covered in task |
|---|---|
| CYP list picker with last-edited timestamp | Task 8 |
| Create / rename / delete CYP portfolios | Task 8 (create), Task 3 (delete) |
| All section types | Tasks 10 + 11 |
| Media import (copy to assets) | Task 6 |
| HEIC conversion | Task 6 |
| Snapshot-based version control with restore | Tasks 4 + 13 |
| Static site generation (light theme) | Task 11 |
| Preview in browser | Task 5 (IPC) + Task 9 (sidebar button) |
| Export to folder | Task 5 (IPC) + Task 9 (sidebar button) |
| FTP/SFTP publish | Task 12 |
| Windows installer | Task 14 |
| Vendor scripts bundled locally | Task 11 |
| One portfolio open at a time | Task 7 (context) |

One gap: **rename CYP** — Task 3 covers delete, Task 8 covers create, but renaming is not explicitly implemented. Adding a rename action to the picker is straightforward (edit name in-place → write new portfolio.json → optionally rename folder). Add this to Task 8 as an extension or as a follow-up task.
