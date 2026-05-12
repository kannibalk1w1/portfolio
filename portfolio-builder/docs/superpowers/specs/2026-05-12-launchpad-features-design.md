# Launchpad — Feature Pack Design Spec

## Features Covered
1. Hero image in header
2. Sub-pages / landing page structure
3. Per-section gap toggle
4. Per-skill colour picker
5. Toggle sections off nav bar
6. Mobile hamburger menu

---

## Feature 1 — Hero Image in Header

### What it does
The portfolio header can display a full-width photo/artwork as the hero background. The existing gradient-to-gradient becomes an overlay on top of the image. Name, tagline, and an optional avatar sit at the bottom of the hero block.

If no hero image is uploaded, the site renders exactly as before (plain gradient). Zero breakage for existing portfolios.

### Data model
`AboutSection` in `src/renderer/src/types/portfolio.ts` gains two optional fields:
```ts
heroImageFilename?: string   // relative to assets/
showAvatarInHero?: boolean   // default true when heroImageFilename is set
```

### Editor UI (`AboutSection.tsx`)
Below the existing avatar section, add:
- **Hero image** — `MediaDropzone` (jpg/jpeg/png/gif/webp/heic). Shows preview with × remove button once uploaded. Same import pattern as avatar.
- **Show avatar in hero** — checkbox. Only rendered when `heroImageFilename` is set. Default: checked.

### Generator (`template.ts`)
When `heroImageFilename` is set, replace the `.hero` background gradient with:
```css
.hero {
  position: relative;
  background: var(--hero-from);   /* fallback colour */
}
.hero-bg {
  position: absolute; inset: 0;
  background-image: url('assets/FILENAME');
  background-size: cover; background-position: center;
  opacity: 0.55;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.82) 35%, rgba(0,0,0,0.18) 100%);
}
.hero-content {
  position: relative;   /* above bg + overlay */
  display: flex; flex-direction: column; align-items: center;
  justify-content: flex-end; padding: 64px 32px 48px; text-align: center;
  color: var(--hero-color);
}
```

The hero HTML becomes (when `heroImageFilename` is set):
```html
<header class="hero">
  <!-- <img> positioned absolute so escSrc applies normally for spaces/special chars -->
  <img src="assets/[escSrc(heroImageFilename)]" class="hero-bg" alt="" aria-hidden="true">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <!-- avatar img (only when showAvatarInHero !== false AND avatarFilename set) -->
    <h1>Name</h1>
    <p class="hero-tagline">Tagline</p>
  </div>
</header>
```

When `heroImageFilename` is NOT set, the hero renders exactly as today (no inner divs, gradient via `.hero` background). No CSS additions are injected.

The hero-bg and hero-overlay CSS is only injected into `<style>` when `heroImageFilename` is set.

---

## Feature 2 — Sub-pages / Landing Page Structure

### What it does
Sections can be individually promoted to their own HTML page. The generated site becomes multi-file:
- `index.html` — landing page: hero + bio + any non-promoted sections + a "My pages" card grid
- `{section.id}.html` — one file per promoted section

Promoted sections appear in the nav with a `↗` indicator and link to their HTML file. Non-promoted sections remain as anchor links on the landing page. Only sections where both `visible === true` AND `isSubPage === true` generate a sub-page HTML file.

Sub-pages have a minimal header: "← [Name]'s Portfolio" linking back to `index.html`. They do not have the full nav bar.

### Data model
`BaseSection` in `portfolio.ts` gains:
```ts
isSubPage?: boolean   // default false / undefined
```

### Editor UI (`Sidebar.tsx` / `SidebarItem.tsx`)
Each sidebar section item gets an **"Own page"** toggle (checkbox or small pill). This toggle is only meaningful for non-About sections (About always stays on the landing). When checked, `isSubPage = true`.

Feature 5's **"Show in nav"** toggle lives beside it in the same sidebar row (see Feature 5).

### Generator (`index.ts`, `template.ts`)

#### Landing page (`index.html`)
- Renders: hero + About bio + all visible non-promoted sections (as today) + "My pages" card grid at the bottom
- "My pages" card grid: one card per promoted section, linking to `{section.id}.html`. Card shows the section title and a section-type emoji icon (same icons as the editor sidebar block picker — e.g. 📷 for gallery, 🎮 for games). Fallback: 📄
- Nav links: non-promoted sections = `#anchor`, promoted sections = `{section.id}.html` with ↗ indicator

#### Sub-pages (`{section.id}.html`)
New function `wrapSubPage(portfolio, sectionHtml, section)` in `template.ts`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>[Section Title] — [Name]'s Portfolio</title>
  <!-- same vendor scripts as needed (model-viewer, highlight) -->
  <!-- same CSS variables + base styles from wrapTemplate -->
</head>
<body>
  <header class="subpage-header">
    <a href="index.html" class="subpage-back">← [Name]'s Portfolio</a>
    <span class="subpage-title">[Section Title]</span>
  </header>
  <main class="sections-wrapper">
    [section HTML — already rendered by renderSection]
  </main>
  [lightbox if needed]
</body>
</html>
```

CSS additions:
```css
.subpage-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--nav-bg); height: 56px; padding: 0 32px;
  display: flex; align-items: center; justify-content: space-between;
}
.subpage-back {
  color: rgba(255,255,255,0.75); text-decoration: none; font-size: 13px;
  font-weight: 500; transition: color .15s;
}
.subpage-back:hover { color: #fff; }
.subpage-title { color: rgba(255,255,255,0.4); font-size: 13px; }
.page-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 16px; margin-top: 8px; }
.page-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  padding: 20px 24px; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); text-decoration: none; color: var(--text);
  font-weight: 600; font-size: 15px; transition: border-color .15s, box-shadow .15s;
}
.page-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.page-card-icon { font-size: 24px; }
```

#### `buildSite` and `buildOfflineSite` changes
Both functions change from writing one `index.html` to writing multiple files. Extract a helper:
```ts
type GeneratedFile = { filename: string; html: string }
function generateAllFiles(portfolio: Portfolio, opts?): GeneratedFile[]
```

Returns `[{ filename: 'index.html', html: landingHtml }, { filename: 'gallery.html', html: subPageHtml }, ...]`.

`buildSite` and `buildOfflineSite` iterate and write each file.

The `embedModelsAsDataUri` function needs to run on each generated file (not just index.html) for offline export.

#### Nav bar in landing page
`buildNavLinks` updated to:
```ts
sections.filter(s => s.visible && s.showInNav !== false).map(s =>
  s.isSubPage
    ? `<a href="${s.id}.html">${s.title} <span class="nav-ext">↗</span></a>`
    : `<a href="#${s.id}">${s.title}</a>`
)
```

---

## Feature 3 — Per-section Gap Toggle

### What it does
Each section card on the published site can remove the gap above it, so two sections sit flush with no space between them.

### Data model
`BaseSection` gains:
```ts
removeGapAbove?: boolean
```

### Editor UI
`SidebarItem.tsx` — a **"No gap"** checkbox alongside the existing visibility toggle and section title. Only shown for non-first sections (there's nothing to remove above the first).

### Generator
`.sections-wrapper` currently uses `gap: 20px`. Change to individual `margin-top` so it can be overridden per section:
```css
/* was: .sections-wrapper { gap: 20px } */
.sections-wrapper { display: flex; flex-direction: column; }
.section + .section { margin-top: 20px; }
.section.no-gap { margin-top: 0 !important; }
```

Section `<section>` tag gets class `no-gap` when `section.removeGapAbove === true`.

All section generator functions pass `removeGapAbove` to the class attribute. A shared helper `sectionClass(section: Section): string` returns `'section'` or `'section no-gap'`.

---

## Feature 4 — Per-skill Colour Picker

### What it does
Each skill badge can have an individually assigned colour. No colour set = falls back to the theme accent colour.

### Data model
`SkillItem` in `portfolio.ts` gains:
```ts
colour?: string   // hex string, e.g. '#6366f1'
```

### Editor UI (`SkillsSection.tsx`)
The skill row changes from `[label input] [× remove]` to `[colour picker] [label input] [× remove]`.

The colour picker is `<input type="color">` (28×28px). When the user hasn't picked a colour, the swatch shows the current accent colour as a visual hint but the value is undefined (not stored).

A "Reset" icon (×) next to the colour picker clears the stored colour back to undefined (uses accent).

### Generator (`skills.ts`)
```ts
const bg = item.colour ?? 'var(--accent)'
const fg = item.colour ? '#ffffff' : '#ffffff'  // always white text
`<span class="skill-badge" style="background:${bg}">${escHtml(item.label)}</span>`
```

---

## Feature 5 — Toggle Sections Off Nav Bar

### What it does
Each section can be hidden from the top nav bar independently of its visibility on the page. Useful for sections the CYP wants on the page but not as a nav link.

### Data model
`BaseSection` gains:
```ts
showInNav?: boolean   // undefined / true = shown (default), false = hidden
```

### Editor UI
`SidebarItem.tsx` — a **"In nav"** checkbox alongside the section title. Checked by default.

This toggle lives in the same sidebar row as Feature 2's "Own page" toggle.

### Generator
`buildNavLinks` in `template.ts` already filters by `s.visible`. Update to also filter by `s.showInNav !== false`.

---

## Feature 6 — Mobile Hamburger Menu

### What it does
On screens ≤640px, the nav links collapse and a hamburger button (☰) appears. Tapping it toggles a dropdown showing all nav links vertically.

### No data/editor changes needed.

### Generator (`template.ts`)
**HTML change** — add hamburger button to the `<nav>`:
```html
<nav>
  <span class="nav-brand">[name]</span>
  <div class="nav-links">[links]</div>
  <button class="nav-hamburger" aria-label="Menu" onclick="toggleNav()">
    <span></span><span></span><span></span>
  </button>
</nav>
```

**CSS additions:**
```css
.nav-hamburger {
  display: none; flex-direction: column; gap: 4px; background: none;
  border: none; cursor: pointer; padding: 6px;
}
.nav-hamburger span {
  display: block; width: 20px; height: 2px;
  background: rgba(255,255,255,0.8); border-radius: 1px;
  transition: transform .2s, opacity .2s;
}
@media (max-width: 640px) {
  .nav-links { display: none; flex-direction: column; position: absolute;
    top: 56px; left: 0; right: 0; background: var(--nav-bg);
    padding: 8px 0; z-index: 99; border-top: 1px solid rgba(255,255,255,0.08); }
  .nav-links.open { display: flex; }
  .nav-links a { padding: 10px 24px; font-size: 14px; }
  .nav-hamburger { display: flex; }
  nav { position: relative; }  /* so nav-links positions relative to nav */
}
```

**JS (~8 lines) added to the `<head>`:**
```js
function toggleNav() {
  document.querySelector('.nav-links').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('nav')) {
    document.querySelector('.nav-links')?.classList.remove('open');
  }
});
```

---

## Implementation Order

Build in this order — each step is independently testable:

1. **Feature 5** (nav toggle) — smallest change, pure generator + data
2. **Feature 3** (gap toggle) — small CSS change + data
3. **Feature 4** (skill colours) — data + editor + generator, self-contained
4. **Feature 6** (hamburger) — generator-only, no data changes
5. **Feature 1** (hero image) — data + editor + generator, standalone
6. **Feature 2** (sub-pages) — largest, builds on all the above

## Files Changed (summary)

| File | Features |
|------|---------|
| `src/renderer/src/types/portfolio.ts` | 1, 2, 3, 4, 5 |
| `src/renderer/src/components/sections/AboutSection.tsx` | 1 |
| `src/renderer/src/components/sections/SkillsSection.tsx` | 4 |
| `src/renderer/src/components/editor/SidebarItem.tsx` | 2, 3, 5 |
| `src/main/generator/template.ts` | 1, 2, 5, 6 |
| `src/main/generator/index.ts` | 2 |
| `src/main/generator/sections/skills.ts` | 4 |
| `src/main/generator/sections/about.ts` | 1 |
| All section generators (shared helper) | 3 |
