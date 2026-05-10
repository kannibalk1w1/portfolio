# CYP Portfolio Builder

A Windows desktop application for building and publishing digital portfolios for Children and Young People (CYPs). Facilitators and CYPs collaboratively assemble a portfolio of digital work — artwork, videos, GIFs, 3D models, code, Godot games — and the app generates a self-contained static site that can be previewed locally, exported to a folder, or published via FTP.

Inspired by [Publii](https://getpublii.com/)'s desktop-CMS-to-static-site model, but purpose-built for media-heavy CYP portfolios.

## Status

Pre-1.0. Core features are implemented and the app runs end-to-end; not yet released. Windows-only.

## Features

- **Picker** — scans a configurable `portfolios/` root and lists each CYP with last-edited timestamp; create / open / change folder
- **Editor** — sidebar with drag-reorderable, hideable sections; per-section content panel
- **Section types** (extensible registry):
  - `about` — name, bio, optional avatar
  - `gallery` — image grid with lightbox
  - `videos` — HTML5 player grid; thumbnails captured via Canvas at import
  - `models` — GLB/GLTF via `<model-viewer>` (vendored locally, no CDN)
  - `games` — Godot HTML5 exports in sandboxed iframes
  - `code` — syntax-highlighted snippets via highlight.js (vendored locally)
  - `custom` — TipTap rich-text block (sanitised on output)
  - `project` — description + cover image + image gallery
- **Media import** — copies files into the portfolio's `assets/`, auto-converts HEIC → JPG
- **Snapshots** — timestamped backup of `portfolio.json` + `assets/` before every save, one-click restore, 90-day prune
- **Static site generator** — pure HTML/CSS/JS, all assets bundled, works opened directly from `file://`
- **Publish** — preview in browser, export to folder, or FTP upload (per-portfolio config)
- **Windows installer** — NSIS via electron-builder

## Tech stack

- Electron 39 + electron-vite
- React 19 + TypeScript
- @dnd-kit/sortable — section reordering
- @tiptap/react — custom rich-text editor
- basic-ftp — publishing
- heic-convert — HEIC → JPG
- sanitize-html — output sanitisation
- @google/model-viewer + highlight.js — vendored locally for offline-capable output
- Vitest + React Testing Library

## Repo layout

```
portfolio-builder/        # the Electron app
  src/main/               # Node main process: IPC, file I/O, generator, publish
  src/preload/            # contextBridge typed API
  src/renderer/           # React UI
  tests/                  # Vitest tests (main + renderer)
docs/superpowers/
  specs/                  # design spec
  plans/                  # implementation plan
```

## Develop

```bash
cd portfolio-builder
npm install
npm run dev               # Electron + Vite dev mode with HMR
```

## Test

```bash
npm run typecheck
npm test
```

## Build the installer

```bash
npm run build:win         # → dist-installer/CYP Portfolio Builder Setup *.exe
```

`build:mac` and `build:linux` scripts exist but are not currently a supported target — the app uses Windows-specific paths and credential storage.

## Generated portfolio layout

Each CYP gets a subfolder under the configured `portfolios/` root:

```
portfolios/
└── alice/
    ├── portfolio.json    # profile + ordered section config
    ├── assets/           # imported media
    ├── snapshots/        # timestamped version history
    └── output/           # generated static site
```

The output folder is fully self-contained — vendor scripts bundled, no CDN, no server required.

## Documentation

- Design spec: [`docs/superpowers/specs/2026-05-08-cyp-portfolio-design.md`](docs/superpowers/specs/2026-05-08-cyp-portfolio-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-05-08-cyp-portfolio-builder.md`](docs/superpowers/plans/2026-05-08-cyp-portfolio-builder.md)
