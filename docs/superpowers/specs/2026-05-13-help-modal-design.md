# Section Help Modal — Design Spec

**Date:** 2026-05-13
**Branch:** feature/build-mvp

## Overview

Add a `?` button to the editor toolbar that opens a centred modal overlay listing all 17 section types with a plain-English description, concrete example, and accepted file types. Audience is both facilitators (adults setting up portfolios) and CYPs (young people writing content), so language is accessible but complete.

---

## Architecture

Two file changes only:

- **`src/renderer/src/components/editor/TopBar.tsx`** — adds a `showHelp` boolean state and a `?` circle button. Renders `<HelpModal onClose={() => setShowHelp(false)} />` when `showHelp` is true.
- **`src/renderer/src/components/shared/HelpModal.tsx`** — new self-contained component. Fixed-position full-screen overlay, no portal needed. Static `SECTION_HELP` data array holds all 17 entries. Takes a single `onClose` prop.

No context changes, no API calls, no persistent state.

---

## Trigger Button

A small circle `?` button added to the right side of the TopBar, between the save-status indicator and the Save button. Styled as a subtle outline circle (`border: 1px solid #d0d0d0`, grey `?` glyph) so it doesn't compete visually with Save.

---

## Modal Layout

- **Backdrop**: fixed-position full-screen dark overlay (`rgba(0,0,0,0.5)`), `z-index: 200`
- **Panel**: centred white card, `max-width: 640px`, `max-height: 80vh`, `border-radius: 12px`, `box-shadow`
- **Header**: "Section Guide" title left, `×` close button right
- **Body**: `overflow-y: auto`, flat scrollable list of all 17 sections

### Per-section entry (flat list)

```
🖼  Gallery                          ← icon + bold name
Show images and GIFs in a grid.      ← plain description
e.g. screenshots of your Godot...    ← italic example, muted colour
Accepts: JPG, PNG, GIF, WEBP...      ← small label, only shown when relevant
```

Each entry separated by a thin divider line. Sections where input is type-only (Links, Skills, Timeline, Quote, Embed, Stats, Buttons, Code) omit the "Accepts" line entirely — it is not shown as "URLs only" or "Type directly", it simply isn't there.

---

## Close Behaviour

Three ways to close — all must work:
1. Click the `×` button in the modal header
2. Click the dark backdrop outside the panel
3. Press `Escape`

---

## Section Help Content

| Section | Description | Example | Accepts |
|---|---|---|---|
| 👤 About Me | Introduce yourself — your name, what you're into, and a bit about you. | "I'm 16, I love making games and 3D art…" | Avatar: JPG, PNG, GIF, WEBP · Hero banner: JPG, PNG, WEBP, AVIF, HEIC, TIFF |
| 🖼 Gallery | Show images and GIFs in a grid. | Screenshots of your Godot project, art you've made, photos of things you've built | JPG, PNG, GIF, WEBP, SVG, AVIF, HEIC, TIFF |
| 🎬 Videos | Upload video files or paste a YouTube/Vimeo link. | A playthrough of your game, a timelapse of your build, a short film | MP4, WEBM, MOV, M4V |
| 📦 3D Models | Display interactive 3D models you can rotate in the browser. | A character model from Blender, a level asset, a prop you designed | GLB, GLTF, FBX, STL, OBJ, PLY, 3DS |
| 🎮 Games | Embed a playable Godot HTML5 game export directly in your portfolio. | Your finished game, a prototype, a game jam entry | Godot HTML5 export folder (File → Export → Web in Godot) |
| 💻 Code | Show syntax-highlighted code snippets with labels. | A GDScript function, a Python script, a shader you wrote | Paste or type directly |
| ⬡ Blueprints | Display Unreal Engine Blueprint node graphs — paste copy-text or upload a screenshot. | A character movement Blueprint, an interaction system | Paste: copy nodes in UE (Ctrl+C) · Screenshot: JPG, PNG, GIF, WEBP |
| 📝 Text | A freeform rich-text block — write anything. | A reflection on what you learned, a blog post, a short story | Type directly; embed images: JPG, PNG, GIF, WEBP |
| 📋 Project | Document a whole project with a cover image, description, and screenshots. | "My first Godot game — what I made, how I made it, what I'd do differently" | JPG, PNG, GIF, WEBP, AVIF, HEIC, TIFF |
| 🔗 Links | A row of labelled links to external sites. | Your itch.io page, GitHub, ArtStation | URLs only |
| ⭐ Skills | Show skills as coloured badge tags. | Blender, GDScript, Pixel Art, Team Leadership | Type directly |
| 📅 Timeline | A vertical timeline of events or milestones. | "Jan 2025 — finished first game", "Mar 2025 — joined Player Ready" | Type directly |
| ❝ Quote | One or more pull-quotes with attribution. | A quote from a mentor, something that inspired you | Type directly |
| 📡 Embed | Embed any website or tool via URL. | A Scratch project, a Google Slides presentation, a Figma file | URLs only |
| 🧩 Content | A flexible block editor — mix text, images, video, quotes, two-column layouts, and progress bars. | A project writeup with images and a skills progress bar | Images: JPG, PNG, GIF, WEBP, HEIC · Video: MP4, WEBM |
| 📊 Stats | Big number callouts for key achievements. | "200 hours", "3 games shipped", "1st place" | Type directly |
| 🔘 Buttons | Call-to-action buttons linking to external pages. | "Play my game", "View my GitHub", "Contact me" | URLs only |

---

## Out of Scope

- Search/filter inside the modal
- Linking from modal entries directly to that section type in the "Add section" picker
- Localisation / translations
