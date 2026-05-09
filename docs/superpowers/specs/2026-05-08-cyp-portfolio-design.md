# CYP Portfolio Builder — Design Spec
**Date:** 2026-05-08

## Overview

A Windows desktop application for building and publishing digital portfolios for Children and Young People (CYPs). Facilitators and CYPs can collaboratively build a portfolio showcasing digital work — artwork, videos, GIFs, 3D models, code, Godot games, and more. The app generates a self-contained static site that can be exported locally or published to a web server.

Inspired by Publii's model (desktop CMS → static site output), but purpose-built for CYP media-heavy portfolios and multi-user management.

---

## Architecture

**Stack:** Electron (main process) + React + TypeScript (renderer process)

- **Main process (Node.js):** File I/O, version snapshots, static site generation, FTP/SFTP publishing, IPC handlers
- **Renderer process (React/TS):** Full editing UI, communicates with main via Electron IPC
- **Static site generator:** Custom, baked in — no external SSG dependency

**Why Electron:** Single Windows installer, full filesystem access, no server required, widely documented for this use case.

---

## Data Model

Each CYP has their own subfolder under a configurable `portfolios/` root directory.

```
portfolios/
  ├── alice/
  │   ├── portfolio.json        ← profile + ordered section config
  │   ├── assets/               ← all uploaded media (copied on import)
  │   ├── snapshots/            ← timestamped version backups
  │   │   ├── 2026-05-08T14-32-00/
  │   │   │   ├── portfolio.json
  │   │   │   └── assets/
  │   │   └── ...
  │   └── output/               ← generated static site
  ├── bob/
  │   └── ...
```

**`portfolio.json` structure:**
```json
{
  "name": "Alice",
  "bio": "Digital artist & game developer",
  "avatarFile": "assets/avatar.jpg",
  "theme": "light",
  "sections": [
    { "id": "about", "type": "about", "visible": true },
    { "id": "gallery-1", "type": "gallery", "title": "My Art", "visible": true, "items": [...] },
    { "id": "games-1", "type": "games", "title": "Games", "visible": true, "items": [...] },
    { "id": "custom-1", "type": "custom", "title": "My Story", "visible": true, "content": "..." }
  ],
  "publish": {
    "ftp": { "host": "", "user": "", "remotePath": "" }
  }
}
```

---

## Version Control

Lightweight snapshot-based versioning — no git dependency.

- Before every save, the app writes a timestamped copy of `portfolio.json` + `assets/` to `snapshots/`
- Snapshots are listed in the UI (sidebar footer or settings panel) with date/time
- A facilitator can restore any snapshot with one click
- Snapshots older than 90 days are pruned automatically (configurable)
- Only one portfolio is open at a time — no path exists to touch another CYP's files while working

---

## UI — App Shell

**Startup screen (list view):**
- Scans the `portfolios/` root and lists all CYPs with name and last-edited timestamp
- "New CYP" button at the bottom
- "Change folder" link to point the app at a different `portfolios/` root
- Double-click or Enter to open a portfolio

**Main editor (sidebar + content panel):**
- Left sidebar: ordered list of portfolio sections, each with visibility toggle and drag handle
- Active section highlighted; clicking loads it in the main panel
- Sidebar footer: snapshot restore access, preview, export, publish buttons
- Top bar: CYP name, "Back to picker" link

---

## Section Types

All sections can be reordered in the sidebar via drag-and-drop or up/down arrows. Any section can be hidden without deleting it.

| Type | Description |
|---|---|
| `about` | Name, bio text, optional avatar image. One per portfolio. |
| `gallery` | Grid of images, GIFs, and artwork. Lightbox on click. |
| `videos` | Grid of video thumbnails, HTML5 player on click. |
| `models` | 3D model viewer cards using `<model-viewer>` (GLB/GLTF). |
| `games` | Embedded Godot HTML5 exports in sandboxed iframes. |
| `code` | Syntax-highlighted code snippets with language selector. |
| `custom` | Free rich-text block — headings, paragraphs, links, inline images. |

New section types can be added over time. Sections are designed as a plugin-style registry so new types slot in without restructuring the codebase.

---

## Media Handling

All media is copied into the CYP's `assets/` folder on import. The published site uses only relative paths — exports are fully self-contained.

| Media type | Accepted formats | Rendered as |
|---|---|---|
| Images / Artwork | jpg, png, gif, webp, svg | Gallery grid, lightbox |
| GIFs | gif | Treated as images, autoplay in lightbox |
| Videos | mp4, webm | HTML5 `<video>` with thumbnail captured via Canvas API on import |
| 3D Models | glb, gltf | `<model-viewer>` — rotate/zoom, no plugin (JS bundled locally in output, not CDN) |
| Code | Any text pasted in | Highlighted via highlight.js (bundled locally) |
| Godot games | Exported HTML5 folder dropped in | Sandboxed `<iframe>` |
| Photos | jpg, png, heic (auto-converted to jpg on import) | Gallery grid |

---

## Published Portfolio — Output

**Visual style:** Light / clean — white background, soft colours, readable typography. Responsive, mobile-friendly.

**Structure:** Single-page site with anchor-linked sections. Navigation bar at top links to each visible section.

**Output is:**
- Pure static HTML/CSS/JS — no server-side code
- All assets bundled in `output/` — fully portable
- Works opened directly from the filesystem (no local server needed)

---

## Publishing Workflow

Three actions available from the editor sidebar:

1. **Preview** — generates `output/` and opens `index.html` in the system default browser
2. **Export** — generates `output/` and opens the folder in Windows Explorer for manual sharing/zipping/copying to USB
3. **Publish** — uploads `output/` to a configured FTP/SFTP host. Connection details stored per-portfolio in `portfolio.json` (password stored in Windows Credential Manager, not in the JSON file)

GitHub Pages / Netlify integration is post-MVP.

---

## MVP Scope

In scope for MVP:
- CYP list picker with last-edited timestamp
- Create / rename / delete CYP portfolios
- All section types: about, gallery, videos, models, games, code, custom
- Media import (copy to assets folder)
- Snapshot-based version control with restore
- Static site generation (light theme)
- Preview in browser
- Export to folder
- FTP/SFTP publish
- Windows installer (via electron-builder)

Out of scope for MVP (post-MVP):
- Multiple themes / theme customisation
- GitHub Pages / Netlify deploy
- CYP login / self-service mode (facilitator-only for MVP)
- Image editing / cropping in-app
- Collaborative real-time editing
- Mobile / Mac / Linux support

---

## Key Constraints

- Windows only
- Portfolios are public — no access control on published sites
- One portfolio open at a time to prevent cross-CYP overwrites
- Self-contained exports must work without internet access
