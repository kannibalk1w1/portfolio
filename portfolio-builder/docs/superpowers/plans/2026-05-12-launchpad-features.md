# Launchpad Feature Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hero image, sub-pages, section gap toggle, skill colours, nav toggle, and mobile hamburger to Launchpad's generated portfolios.

**Architecture:** Six features land in implementation order: nav toggle → gap toggle → skill colours → hamburger → hero image → sub-pages. The first five are self-contained data+editor+generator changes. Sub-pages is a larger refactor that makes the generator produce multiple HTML files; it builds on the sidebar toggles added in the earlier tasks.

**Tech Stack:** Electron + React 18 + TypeScript + electron-vite. No test framework — verify with `npm run typecheck` and manual preview. Working directory: `C:\Users\kanni\Documents\Portfolio\portfolio-builder`.

---

## File Map

| File | Tasks |
|------|-------|
| `src/renderer/src/types/portfolio.ts` | 1 |
| `src/renderer/src/components/editor/SidebarItem.tsx` | 2 |
| `src/renderer/src/components/editor/Sidebar.tsx` | 2 |
| `src/renderer/src/components/sections/SkillsSection.tsx` | 3 |
| `src/main/generator/sections/skills.ts` | 3 |
| `src/main/generator/template.ts` | 4, 5, 9 |
| `src/renderer/src/components/sections/AboutSection.tsx` | 5 |
| `src/main/generator/index.ts` | 6, 10 |
| `src/main/generator/sections/about.ts` | 5 |

---

## Task 1 — Data model: add fields for all six features

**Files:**
- Modify: `src/renderer/src/types/portfolio.ts`

- [ ] **Step 1: Add three fields to `BaseSection`**

Find:
```ts
export interface BaseSection {
  id: string
  type: SectionType
  title: string
  visible: boolean
}
```
Replace with:
```ts
export interface BaseSection {
  id: string
  type: SectionType
  title: string
  visible: boolean
  showInNav?: boolean       // undefined/true = shown in nav (default), false = hidden
  isSubPage?: boolean       // true = generates its own HTML page
  removeGapAbove?: boolean  // true = removes the margin-top gap above this section card
}
```

- [ ] **Step 2: Add two fields to `AboutSection`**

Find:
```ts
export interface AboutSection extends BaseSection {
  type: 'about'
  bio: string
  avatarFilename?: string
}
```
Replace with:
```ts
export interface AboutSection extends BaseSection {
  type: 'about'
  bio: string
  avatarFilename?: string
  heroImageFilename?: string  // full-width banner behind the hero gradient
  showAvatarInHero?: boolean  // default true when heroImageFilename is set
}
```

- [ ] **Step 3: Add `colour` to `SkillItem`**

Find:
```ts
export interface SkillItem {
  id: string
  label: string
}
```
Replace with:
```ts
export interface SkillItem {
  id: string
  label: string
  colour?: string  // hex — overrides the deterministic badge colour
}
```

- [ ] **Step 4: Typecheck**
```
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**
```
git add src/renderer/src/types/portfolio.ts
git commit -m "feat: data model fields for nav toggle, sub-pages, gap, skill colour, hero image"
```

---

## Task 2 — Sidebar: three section toggles (In nav / Own page / No gap)

**Files:**
- Modify: `src/renderer/src/components/editor/SidebarItem.tsx`
- Modify: `src/renderer/src/components/editor/Sidebar.tsx`

These three toggles appear as a compact secondary row beneath each sidebar item, visible when the item is active or hovered.

- [ ] **Step 1: Update `SidebarItem` props interface and component**

Replace the entire contents of `src/renderer/src/components/editor/SidebarItem.tsx` with:

```tsx
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Section } from '../../types/portfolio'

const SECTION_ICONS: Record<string, string> = {
  about: '👤',
  gallery: '🖼',
  videos: '🎬',
  models: '📦',
  games: '🎮',
  code: '💻',
  custom: '📝',
  project: '📋',
}

interface Props {
  section: Section
  active: boolean
  onClick: () => void
  onToggleVisible: () => void
  onToggleNav: () => void
  onToggleSubPage: () => void
  onToggleGap: () => void
  onDelete: () => void
}

export function SidebarItem({ section, active, onClick, onToggleVisible, onToggleNav, onToggleSubPage, onToggleGap, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })
  const [hovered, setHovered] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete "${section.title}"? This cannot be undone.`)) onDelete()
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, borderRadius: 6, background: active ? '#f0f0f0' : 'transparent', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#ccc', fontSize: 14, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >⠿</span>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{SECTION_ICONS[section.type] ?? '📄'}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {section.title}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onToggleVisible() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: section.visible ? '#555' : '#ccc', fontSize: 14, flexShrink: 0 }}
          title={section.visible ? 'Hide section' : 'Show section'}
          aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`}
        >{section.visible ? '👁' : '🙈'}</button>
        <button
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, color: hovered || active ? '#e94560' : 'transparent', transition: 'color 0.1s' }}
          title={`Delete ${section.title}`}
          aria-label={`Delete ${section.title}`}
        >×</button>
      </div>

      {/* Toggles row — visible when active or hovered */}
      {(active || hovered) && (
        <div
          style={{ display: 'flex', gap: 10, paddingLeft: 22, paddingBottom: 6, flexWrap: 'wrap' }}
          onClick={e => e.stopPropagation()}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={section.showInNav !== false} onChange={() => onToggleNav()} style={{ margin: 0 }} />
            In nav
          </label>
          {section.type !== 'about' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={!!section.isSubPage} onChange={() => onToggleSubPage()} style={{ margin: 0 }} />
              Own page
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#888', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={!!section.removeGapAbove} onChange={() => onToggleGap()} style={{ margin: 0 }} />
            No gap
          </label>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add three handlers in `Sidebar.tsx` and pass them to `SidebarItem`**

In `src/renderer/src/components/editor/Sidebar.tsx`, after the existing `handleToggleVisible` function, add:

```ts
  function handleToggleNav(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, showInNav: s.showInNav === false ? undefined : false } : s
      ),
    })
  }

  function handleToggleSubPage(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, isSubPage: !s.isSubPage } : s
      ),
    })
  }

  function handleToggleGap(id: string) {
    updatePortfolio({
      ...portfolio,
      sections: portfolio.sections.map(s =>
        s.id === id ? { ...s, removeGapAbove: !s.removeGapAbove } : s
      ),
    })
  }
```

Then update the `<SidebarItem>` call (find it by `onToggleVisible`) to pass the three new props:

```tsx
              <SidebarItem
                key={section.id}
                section={section}
                active={section.id === activeSectionId}
                onClick={() => onSelectSection(section.id)}
                onToggleVisible={() => handleToggleVisible(section.id)}
                onToggleNav={() => handleToggleNav(section.id)}
                onToggleSubPage={() => handleToggleSubPage(section.id)}
                onToggleGap={() => handleToggleGap(section.id)}
                onDelete={() => handleDelete(section.id)}
              />
```

- [ ] **Step 3: Typecheck**
```
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**
```
git add src/renderer/src/components/editor/SidebarItem.tsx src/renderer/src/components/editor/Sidebar.tsx
git commit -m "feat: sidebar section toggles — In nav, Own page, No gap"
```

---

## Task 3 — Skill colours: per-badge colour picker

**Files:**
- Modify: `src/renderer/src/components/sections/SkillsSection.tsx`
- Modify: `src/main/generator/sections/skills.ts`

- [ ] **Step 1: Add `updateSkillColour` helper and colour picker to each badge in `SkillsSection.tsx`**

In `src/renderer/src/components/sections/SkillsSection.tsx`, after `removeSkill`, add:

```ts
  function updateSkillColour(id: string, colour: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, colour } : i) })
  }
```

Then find the badge `<div>` (it has `background: bg, color: text`). Replace the entire badge `<div>` with:

```tsx
              <div
                key={item.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: item.colour ?? bg, color: item.colour ? '#ffffff' : text, borderRadius: 999, fontSize: 13, fontWeight: 600 }}
              >
                <input
                  type="color"
                  value={item.colour ?? bg}
                  onChange={e => updateSkillColour(item.id, e.target.value)}
                  title="Pick badge colour"
                  style={{ width: 14, height: 14, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', background: 'none', flexShrink: 0, opacity: 0.7 }}
                />
                {item.label}
                <button
                  onClick={() => removeSkill(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.colour ? '#ffffff' : text, opacity: 0.6, fontSize: 14, lineHeight: 1, padding: 0 }}
                  aria-label={`Remove ${item.label}`}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >×</button>
              </div>
```

- [ ] **Step 2: Update `skills.ts` generator to use `item.colour`**

In `src/main/generator/sections/skills.ts`, find the `renderSkills` function and replace the badge map:

```ts
  const badges = section.items
    .map(item => {
      const { bg, text } = badgeColour(item.label)
      const bgFinal = item.colour ?? bg
      const textFinal = item.colour ? '#ffffff' : text
      return `<span class="skill-badge" style="background:${bgFinal};color:${textFinal};">${escHtml(item.label)}</span>`
    })
    .join('')
```

- [ ] **Step 3: Typecheck**
```
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**
```
git add src/renderer/src/components/sections/SkillsSection.tsx src/main/generator/sections/skills.ts
git commit -m "feat: per-skill colour picker — overrides random badge colour"
```

---

## Task 4 — Hamburger menu for mobile

**Files:**
- Modify: `src/main/generator/template.ts`

- [ ] **Step 1: Add hamburger CSS to the style block**

Read `src/main/generator/template.ts`. Find the responsive media query block:
```css
    /* ── Responsive ── */
    @media (max-width: 640px) {
      .hero { padding: 48px 20px 44px; }
      .hero h1 { font-size: 30px; }
      .hero-avatar { width: 90px; height: 90px; }
      .sections-wrapper { padding: 24px 16px 40px; }
      .section { padding: 24px 20px; }
```

Before that block, add:
```css
    /* ── Hamburger nav ── */
    .nav-hamburger { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
    .nav-hamburger span { display: block; width: 20px; height: 2px; background: rgba(255,255,255,0.8); border-radius: 1px; }
```

Inside the existing `@media (max-width: 640px)` block, add after the last rule before the closing `}`:
```css
      .nav-hamburger { display: flex; }
      nav { position: relative; }
      .nav-links { display: none; flex-direction: column; position: absolute; top: 56px; left: 0; right: 0; background: var(--nav-bg); padding: 8px 0; z-index: 99; border-top: 1px solid rgba(255,255,255,0.08); }
      .nav-links.nav-open { display: flex; }
      .nav-links a { padding: 10px 24px; font-size: 14px; }
```

- [ ] **Step 2: Add hamburger button to the nav HTML**

In the `wrapTemplate` function, find the nav HTML string (it contains `<nav>` and `class="nav-brand"` and `class="nav-links"`). It looks like:
```ts
  <nav>
      <span class="nav-brand">${escHtml(portfolio.name)}</span>
      <div class="nav-links">
```

Replace with:
```ts
  <nav>
      <span class="nav-brand">${escHtml(portfolio.name)}</span>
      <div class="nav-links" id="rte-nav">
```

And after the closing `</div>` of `nav-links` but before `</nav>`, add:
```ts
      <button class="nav-hamburger" aria-label="Open menu" onclick="document.getElementById('rte-nav').classList.toggle('nav-open')">
        <span></span><span></span><span></span>
      </button>
```

- [ ] **Step 3: Add close-on-outside-click JS before `</body>`**

Find the closing `</body>` tag in the template string and add before it:
```ts
  <script>document.addEventListener('click',function(e){if(!e.target.closest('nav')){var n=document.getElementById('rte-nav');if(n)n.classList.remove('nav-open')}})</script>
```

- [ ] **Step 4: Typecheck**
```
npm run typecheck
```

- [ ] **Step 5: Commit**
```
git add src/main/generator/template.ts
git commit -m "feat: mobile hamburger menu in generated portfolio"
```

---

## Task 5 — Hero image: editor UI

**Files:**
- Modify: `src/renderer/src/components/sections/AboutSection.tsx`

- [ ] **Step 1: Add `handleHeroImport` function**

In `src/renderer/src/components/sections/AboutSection.tsx`, after the existing `handleAvatarImport` function, add:

```ts
  async function handleHeroImport(paths: string[]) {
    const filenames = await window.api.importMedia(state.portfolioDir!, paths)
    if (filenames[0]) updateSection({ heroImageFilename: filenames[0] })
  }
```

- [ ] **Step 2: Add hero image UI block**

In the return JSX, add a new block **before** the existing avatar section (`<div style={{ marginBottom: 16 }}><span>Avatar photo</span>`). Insert:

```tsx
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>Hero banner image</span>
        <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Full-width image shown behind the header on your portfolio</span>
        {section.heroImageFilename && (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img
              src={toFileUrl(`${state.portfolioDir}/assets/${section.heroImageFilename}`)}
              style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              alt="Hero banner"
              loading="lazy"
            />
            <button
              onClick={() => updateSection({ heroImageFilename: undefined, showAvatarInHero: undefined })}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}
              aria-label="Remove hero image"
            >×</button>
          </div>
        )}
        <MediaDropzone
          label="Click to add a hero banner image"
          filters={[{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]}
          multiple={false}
          onFiles={handleHeroImport}
        />
        {section.heroImageFilename && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={section.showAvatarInHero !== false}
              onChange={e => updateSection({ showAvatarInHero: e.target.checked })}
            />
            Show avatar in hero
          </label>
        )}
      </div>
```

- [ ] **Step 3: Typecheck**
```
npm run typecheck
```

- [ ] **Step 4: Commit**
```
git add src/renderer/src/components/sections/AboutSection.tsx
git commit -m "feat: hero banner image upload in About section editor"
```

---

## Task 6 — Hero image: generator

**Files:**
- Modify: `src/main/generator/template.ts`

- [ ] **Step 1: Read `template.ts` and locate the hero section**

Read the file. Find these two parts:
1. The `heroAvatar` const (around line 125)
2. The `<header class="hero">` block in the returned HTML (around line 370)

- [ ] **Step 2: Replace hero generation logic**

Find the existing hero avatar block:
```ts
  const aboutSection = portfolio.sections.find(s => s.type === 'about' && s.visible)
  const avatarFilename = aboutSection?.type === 'about' ? aboutSection.avatarFilename : undefined
  const heroAvatar = avatarFilename
    ? `\n    <img src="assets/${escSrc(avatarFilename)}" class="hero-avatar" alt="${escHtml(portfolio.name)}">`
    : ''
```

Replace with:
```ts
  const aboutSection = portfolio.sections.find(s => s.type === 'about' && s.visible)
  const avatarFilename = aboutSection?.type === 'about' ? aboutSection.avatarFilename : undefined
  const heroImageFilename = aboutSection?.type === 'about' ? aboutSection.heroImageFilename : undefined
  const showAvatarInHero = aboutSection?.type === 'about' ? aboutSection.showAvatarInHero !== false : false
  const heroAvatar = (showAvatarInHero && avatarFilename)
    ? `<img src="assets/${escSrc(avatarFilename)}" class="hero-avatar" alt="${escHtml(portfolio.name)}">`
    : ''
  const heroBg = heroImageFilename
    ? `<img src="assets/${escSrc(heroImageFilename)}" class="hero-bg" alt="" aria-hidden="true">
    <div class="hero-overlay"></div>`
    : ''
```

- [ ] **Step 3: Update the hero HTML block in the returned template string**

Find:
```ts
  <header class="hero">${heroAvatar}
    <h1>${escHtml(portfolio.name)}</h1>
    ${portfolio.tagline ? `<p class="hero-tagline">${escHtml(portfolio.tagline)}</p>` : ''}
  </header>
```

Replace with:
```ts
  <header class="hero">
    ${heroBg}
    ${heroImageFilename ? '<div class="hero-content">' : ''}
    ${heroAvatar}
    <h1>${escHtml(portfolio.name)}</h1>
    ${portfolio.tagline ? `<p class="hero-tagline">${escHtml(portfolio.tagline)}</p>` : ''}
    ${heroImageFilename ? '</div>' : ''}
  </header>
```

- [ ] **Step 4: Add hero image CSS and update `.hero` rule**

In the `<style>` block, after the existing `.hero { ... }` rule, add:
```css
    .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 0.55; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.82) 35%, rgba(0,0,0,0.18) 100%); }
    .hero-content { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0; }
```

Also update the existing `.hero` rule to add `position: relative; overflow: hidden;`. Find:
```css
    .hero { background: linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%); padding: 64px 32px 60px; text-align: center; color: var(--hero-color); }
```
Replace with:
```css
    .hero { background: linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%); padding: 64px 32px 60px; text-align: center; color: var(--hero-color); position: relative; overflow: hidden; }
```

- [ ] **Step 5: Typecheck**
```
npm run typecheck
```

- [ ] **Step 6: Commit**
```
git add src/main/generator/template.ts
git commit -m "feat: hero banner image in generated portfolio header"
```

---

## Task 7 — Nav toggle + gap class: generator

**Files:**
- Modify: `src/main/generator/template.ts`
- Modify: `src/main/generator/index.ts`

- [ ] **Step 1: Update `buildNavLinks` to respect `showInNav`**

In `template.ts`, find:
```ts
function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible)
    .map(s => `<a href="#${escHtml(s.id)}">${escHtml(s.title)}</a>`)
    .join('\n      ')
}
```

Replace with:
```ts
function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible && s.showInNav !== false)
    .map(s => `<a href="#${escHtml(s.id)}">${escHtml(s.title)}</a>`)
    .join('\n      ')
}
```

- [ ] **Step 2: Update `.sections-wrapper` CSS from `gap` to `margin-top`**

In the `<style>` block in `template.ts`, find:
```css
    .sections-wrapper { max-width: 1040px; margin: 0 auto; padding: 40px 24px 56px; display: flex; flex-direction: column; gap: 20px; }
```

Replace with:
```css
    .sections-wrapper { max-width: 1040px; margin: 0 auto; padding: 40px 24px 56px; display: flex; flex-direction: column; }
    .section + .section { margin-top: 20px; }
    .section.no-gap { margin-top: 0 !important; }
```

- [ ] **Step 3: Add `renderSectionWithClass` helper in `index.ts`**

In `src/main/generator/index.ts`, after the `renderSection` function (around line 42), add:

```ts
function renderSectionWithClass(section: Section): string {
  const html = renderSection(section)
  if (section.removeGapAbove) {
    return html.replace(/class="section"/, 'class="section no-gap"')
  }
  return html
}
```

- [ ] **Step 4: Use `renderSectionWithClass` in `buildSite` and `buildOfflineSite`**

In `buildSite` (around line 85), find:
```ts
  const body = portfolio.sections
    .filter(s => s.visible)
    .map(renderSection)
    .join('\n')
```
Replace `renderSection` with `renderSectionWithClass`.

In `buildOfflineSite` (around line 231), find:
```ts
  const body = portfolio.sections.filter(s => s.visible).map(renderSection).join('\n')
```
Replace `renderSection` with `renderSectionWithClass`.

- [ ] **Step 5: Typecheck**
```
npm run typecheck
```

- [ ] **Step 6: Commit**
```
git add src/main/generator/template.ts src/main/generator/index.ts
git commit -m "feat: nav toggle and per-section gap removal in generated site"
```

---

## Task 8 — Sub-pages: template helpers

**Files:**
- Modify: `src/main/generator/template.ts`

This task adds `wrapSubPage`, `buildPageCards`, and updates `buildNavLinks` for sub-pages, plus the required CSS.

- [ ] **Step 1: Update `buildNavLinks` to emit sub-page links**

Find the `buildNavLinks` function (just updated in Task 7). Replace with:

```ts
function buildNavLinks(sections: Section[]): string {
  return sections
    .filter(s => s.visible && s.showInNav !== false)
    .map(s => s.isSubPage
      ? `<a href="${escHtml(s.id)}.html">${escHtml(s.title)} <span class="nav-ext">↗</span></a>`
      : `<a href="#${escHtml(s.id)}">${escHtml(s.title)}</a>`
    )
    .join('\n      ')
}
```

- [ ] **Step 2: Add sub-page and page-card CSS to the style block**

In the `<style>` block in `wrapTemplate`, after the `.nav-hamburger` CSS block, add:

```css
    /* ── Sub-page header ── */
    .subpage-header { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); height: 56px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
    .subpage-back { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .subpage-back:hover { color: #fff; }
    .subpage-title { color: rgba(255,255,255,0.4); font-size: 13px; }
    /* ── Page cards (landing) ── */
    .page-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 8px; }
    .page-card { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 20px 24px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: var(--text); font-weight: 600; font-size: 15px; transition: border-color .15s, box-shadow .15s; }
    .page-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .page-card-icon { font-size: 24px; }
    .nav-ext { font-size: 10px; opacity: 0.7; }
```

- [ ] **Step 3: Add `buildPageCards` helper function**

After `buildNavLinks`, add:

```ts
const PAGE_ICONS: Record<string, string> = {
  about: '👤', gallery: '🖼', videos: '🎬', models: '📦', games: '🎮',
  code: '💻', custom: '📝', project: '📋', links: '🔗', skills: '⭐',
  timeline: '📅', quote: '❝', embed: '📡', content: '🧩', stats: '📊', buttons: '🔘',
}

export function buildPageCards(sections: Section[]): string {
  const cards = sections
    .map(s => `<a href="${escHtml(s.id)}.html" class="page-card">
      <span class="page-card-icon">${PAGE_ICONS[s.type] ?? '📄'}</span>
      <span>${escHtml(s.title)}</span>
    </a>`)
    .join('\n    ')
  return `\n<section class="section">
  <h2 class="section-title">My Pages</h2>
  <div class="page-cards">${cards}</div>
</section>`
}
```

- [ ] **Step 4: Add `wrapSubPage` export function**

After `wrapTemplate`, add:

```ts
export function wrapSubPage(
  portfolio: Portfolio,
  sectionHtml: string,
  section: Section,
  opts?: { inlineModelViewer?: string | null },
): string {
  const needsMV = section.type === 'models' && (section as any).items?.length > 0
  let modelViewerScript = ''
  if (needsMV) {
    if (opts?.inlineModelViewer) {
      const safe = opts.inlineModelViewer.replace(/<\/script>/gi, '<\\/script>')
      modelViewerScript = `<script type="module">${safe}</script>`
    } else {
      modelViewerScript = `<script type="module" src="assets/vendor/model-viewer.min.js"></script>`
    }
  }

  const needsHighlight = section.type === 'code' && (section as any).items?.length > 0
  const highlightLinks = needsHighlight
    ? `  <link rel="stylesheet" href="assets/vendor/highlight.min.css">
  <script src="assets/vendor/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll())</script>`
    : ''

  const needsLightbox = (section.type === 'gallery' || section.type === 'project') &&
    ((section as any).items?.length > 0 || (section as any).coverImageFilename)

  const lightbox = needsLightbox ? `
  <div id="lb" role="dialog" aria-modal="true" aria-label="Image viewer">
    <button id="lb-close" aria-label="Close">&times;</button>
    <img id="lb-img" src="" alt="">
  </div>
  <script>
    (function () {
      var lb  = document.getElementById('lb');
      var img = document.getElementById('lb-img');
      function open(src) { img.src = src; lb.classList.add('open'); }
      function close()   { lb.classList.remove('open'); img.src = ''; }
      document.querySelectorAll('.lb-trigger').forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); open(el.dataset.src || el.src); });
      });
      document.getElementById('lb-close').addEventListener('click', close);
      lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();
  </script>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(section.title)} — ${escHtml(portfolio.name)}</title>
  ${modelViewerScript}
  ${highlightLinks}
  <style>
    :root {
      ${themeVars(portfolio.theme)}
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    }
    ${buildCustomisationCss(portfolio.customisation)}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    img { max-width: 100%; display: block; }
    .subpage-header { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); height: 56px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
    .subpage-back { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .subpage-back:hover { color: #fff; }
    .subpage-title { color: rgba(255,255,255,0.4); font-size: 13px; }
    .sections-wrapper { max-width: 1040px; margin: 0 auto; padding: 40px 24px 56px; }
    .section { background: var(--card); border-radius: var(--radius); padding: 32px 36px; box-shadow: var(--shadow); }
    .section-title { font-size: 19px; font-weight: 700; margin-bottom: 24px; padding-left: 14px; border-left: 4px solid var(--accent); color: var(--text); }
    .section-description { font-size: 15px; margin-bottom: 20px; line-height: 1.75; }
    .section-description > * + * { margin-top: .65em; }
    .section-description h1 { font-size: 1.6em; font-weight: 700; }
    .section-description h2 { font-size: 1.35em; font-weight: 700; }
    .section-description h3 { font-size: 1.15em; font-weight: 600; }
    .section-description ul, .section-description ol { padding-left: 1.4em; }
    .section-description blockquote { border-left: 3px solid var(--border); padding-left: 12px; color: var(--muted); }
    .section-description a { color: var(--accent-d); }
    .section-description mark { background: #fef08a; border-radius: 2px; padding: 0 2px; }
    .section-description code { background: var(--bg); padding: 1px 5px; border-radius: 3px; font-size: .9em; font-family: monospace; }
    .section-description pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; }
    .section-description pre code { background: none; padding: 0; color: inherit; }
    .section-description img { max-width: 100%; border-radius: 6px; margin: 8px 0; cursor: zoom-in; }
    .section-description table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .section-description td, .section-description th { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
    .section-description th { background: var(--bg); font-weight: 600; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
    .gallery-item { display: flex; flex-direction: column; gap: 5px; }
    .gallery-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; cursor: zoom-in; transition: transform .2s, box-shadow .2s; }
    .gallery-item img:hover { transform: scale(1.04); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .gallery-caption { font-size: 12px; color: var(--muted); text-align: center; }
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .video-item video { width: 100%; border-radius: 8px; }
    .video-caption { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .model-label { text-align: center; font-size: 13px; color: var(--muted); margin-top: 8px; }
    .game-item { margin-bottom: 32px; } .game-item:last-child { margin-bottom: 0; }
    .game-item h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }
    .code-block { margin-bottom: 20px; } .code-block:last-child { margin-bottom: 0; }
    .code-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 6px; font-family: monospace; text-transform: uppercase; letter-spacing: .05em; }
    pre { background: var(--code-bg); color: #e2e8f0; border-radius: 8px; padding: 18px 20px; overflow-x: auto; }
    code { font-family: 'Cascadia Code', 'Fira Code', ui-monospace, monospace; font-size: 13px; }
    pre code { color: inherit; background: none; }
    .project-cover { width: 100%; max-height: 420px; object-fit: cover; border-radius: 10px; margin-bottom: 24px; cursor: zoom-in; }
    .links-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .link-card { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--text); font-size: 15px; font-weight: 500; transition: border-color .15s, color .15s; }
    .link-card:hover { border-color: var(--accent); color: var(--accent-d); }
    .link-icon { font-size: 20px; line-height: 1; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .skill-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 14px; font-weight: 600; }
    .timeline { display: flex; flex-direction: column; border-left: 2px solid var(--border); margin-left: 8px; }
    .tl-item { display: flex; gap: 16px; align-items: flex-start; padding: 0 0 24px 24px; position: relative; }
    .tl-dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid var(--card); flex-shrink: 0; }
    .tl-date { font-size: 12px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
    .tl-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .tl-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 16px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 8px; }
    .stat-label { font-size: 13px; color: var(--muted); font-weight: 500; }
    .btn-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .site-btn { display: inline-flex; align-items: center; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: opacity .15s; }
    .site-btn:hover { opacity: .85; }
    .site-btn.primary { background: var(--accent); color: #fff; }
    .site-btn.secondary { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .site-btn.outline { background: transparent; color: var(--accent); border: 2px solid var(--accent); }
    .quote-block { border-left: 4px solid var(--accent); padding: 16px 20px; margin: 8px 0; background: var(--bg); border-radius: 0 8px 8px 0; }
    .quote-text { font-size: 18px; font-style: italic; color: var(--text); line-height: 1.6; }
    .quote-attr { font-size: 13px; color: var(--muted); margin-top: 8px; display: block; }
    .embed-frame { width: 100%; border: none; border-radius: 8px; }
    .cb { margin-bottom: 16px; } .cb:last-child { margin-bottom: 0; }
    .cb-caption { font-size: 13px; color: var(--muted); margin-top: 6px; text-align: center; }
    .cb-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .cb-progress { margin-bottom: 4px; }
    .progress-label { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .progress-bar-bg { background: var(--border); border-radius: 999px; height: 10px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }
    hr.divider-line { border: none; border-top: 2px solid var(--border); margin: 16px 0; }
    hr.divider-dots { border: none; margin: 16px 0; text-align: center; }
    hr.divider-dots::before { content: '· · ·'; font-size: 20px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-stars { border: none; margin: 16px 0; text-align: center; }
    hr.divider-stars::before { content: '★  ★  ★'; font-size: 16px; color: var(--muted); letter-spacing: 4px; }
    hr.divider-thick { border: none; border-top: 4px solid var(--border); margin: 16px 0; }
    .callout { padding: 12px 16px 12px 44px; border-radius: 8px; border-left: 4px solid; margin: 12px 0; position: relative; }
    .callout::before { position: absolute; left: 12px; top: 13px; font-size: 16px; line-height: 1; }
    .callout-info { background: #eff6ff; border-color: #3b82f6; } .callout-info::before { content: 'ℹ️'; }
    .callout-tip { background: #f0fdf4; border-color: #22c55e; } .callout-tip::before { content: '💡'; }
    .callout-warning { background: #fffbeb; border-color: #f59e0b; } .callout-warning::before { content: '⚠️'; }
    .callout-note { background: #faf5ff; border-color: #8b5cf6; } .callout-note::before { content: '📝'; }
    .colour-palette { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; padding: 2px 0; }
    .palette-swatch { width: 28px; height: 28px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.12); }
    #lb { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; }
    #lb.open { display: flex; }
    #lb-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
    #lb-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #fff; font-size: 32px; cursor: pointer; line-height: 1; }
    @media (max-width: 640px) { .section { padding: 24px 20px; } .cb-two-col { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="subpage-header">
    <a href="index.html" class="subpage-back">← ${escHtml(portfolio.name)}'s Portfolio</a>
    <span class="subpage-title">${escHtml(section.title)}</span>
  </header>
  <main class="sections-wrapper">
    ${sectionHtml}
  </main>
  ${lightbox}
  <script>document.addEventListener('click',function(e){if(!e.target.closest('nav')){var n=document.getElementById('rte-nav');if(n)n.classList.remove('nav-open')}})</script>
</body>
</html>`
}
```

- [ ] **Step 5: Typecheck**
```
npm run typecheck
```

- [ ] **Step 6: Commit**
```
git add src/main/generator/template.ts
git commit -m "feat: wrapSubPage, buildPageCards, sub-page CSS and nav link for sub-pages"
```

---

## Task 9 — Sub-pages: multi-file generator

**Files:**
- Modify: `src/main/generator/index.ts`

This is the largest task. `buildSite` and `buildOfflineSite` must write one HTML file per visible sub-page section plus `index.html` for the landing page. The landing page renders only non-sub-page sections, plus a page cards block at the bottom if any sub-pages exist.

- [ ] **Step 1: Import `wrapSubPage` and `buildPageCards`**

At the top of `src/main/generator/index.ts`, the existing import of `wrapTemplate` is:
```ts
import { wrapTemplate } from './template'
```

Replace with:
```ts
import { wrapTemplate, wrapSubPage, buildPageCards } from './template'
```

Note: `buildPageCards` needs to be exported from `template.ts`. Check the function added in Task 8 is exported — if it is a plain (non-exported) function, add `export` before it.

- [ ] **Step 2: Update `buildSite` to produce multiple HTML files**

Find the `buildSite` function. Replace the body from `// Render sections` onwards (keeping everything before that — the directory creation and asset copy code) with:

```ts
  // Separate landing sections from sub-page sections
  const landingSections = portfolio.sections.filter(s => s.visible && !s.isSubPage)
  const subPageSections = portfolio.sections.filter(s => s.visible && s.isSubPage)

  // Landing page
  const landingBody = landingSections.map(renderSectionWithClass).join('\n')
  const pageCardsBlock = subPageSections.length > 0 ? buildPageCards(subPageSections) : ''
  const landingHtml = wrapTemplate(portfolio, landingBody + pageCardsBlock)
  await writeFile(join(outputDir, 'index.html'), landingHtml, 'utf-8')

  // Sub-pages
  for (const section of subPageSections) {
    const sectionHtml = renderSectionWithClass(section)
    const html = wrapSubPage(portfolio, sectionHtml, section)
    await writeFile(join(outputDir, `${section.id}.html`), html, 'utf-8')
  }
```

- [ ] **Step 3: Update `buildOfflineSite` similarly**

In `buildOfflineSite`, find the lines that render and write `index.html`:
```ts
  const body = portfolio.sections.filter(s => s.visible).map(renderSection).join('\n')
  let html = wrapTemplate(portfolio, body, { inlineModelViewer: modelViewerContent })
  html = await embedModelsAsDataUri(html, destAssets)
  await writeFile(join(destDir, 'index.html'), html, 'utf-8')
```

Replace with:
```ts
  const landingSections = portfolio.sections.filter(s => s.visible && !s.isSubPage)
  const subPageSections = portfolio.sections.filter(s => s.visible && s.isSubPage)

  // Landing page
  const landingBody = landingSections.map(renderSectionWithClass).join('\n')
  const pageCardsBlock = subPageSections.length > 0 ? buildPageCards(subPageSections) : ''
  let landingHtml = wrapTemplate(portfolio, landingBody + pageCardsBlock, { inlineModelViewer: modelViewerContent })
  landingHtml = await embedModelsAsDataUri(landingHtml, destAssets)
  await writeFile(join(destDir, 'index.html'), landingHtml, 'utf-8')

  // Sub-pages
  for (const section of subPageSections) {
    const sectionHtml = renderSectionWithClass(section)
    let html = wrapSubPage(portfolio, sectionHtml, section, { inlineModelViewer: modelViewerContent })
    html = await embedModelsAsDataUri(html, destAssets)
    await writeFile(join(destDir, `${section.id}.html`), html, 'utf-8')
  }
```

- [ ] **Step 4: Export `buildPageCards` from template.ts**

In `src/main/generator/template.ts`, ensure the `buildPageCards` function added in Task 8 has the `export` keyword:
```ts
export function buildPageCards(sections: Section[]): string {
```

- [ ] **Step 5: Typecheck**
```
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**
```
git add src/main/generator/index.ts src/main/generator/template.ts
git commit -m "feat: sub-pages — generator produces one HTML file per promoted section"
```

---

## Verification Checklist

After all tasks complete, run the app (`npm run dev`) and verify:

**Features 3, 5 (gap + nav):**
- [ ] Hover a sidebar section → see "In nav", "Own page", "No gap" checkboxes
- [ ] Uncheck "In nav" → preview → section link missing from nav bar
- [ ] Check "No gap" on a section → preview → no space above that section card

**Feature 4 (skill colours):**
- [ ] Open Skills section → each badge has a small colour swatch on the left
- [ ] Click the swatch → OS colour picker opens → pick a colour → badge updates immediately
- [ ] Preview → badge shows chosen colour instead of random colour

**Feature 6 (hamburger):**
- [ ] Preview → resize browser narrow (< 640px) or use DevTools mobile emulation → hamburger ☰ appears
- [ ] Click ☰ → nav links dropdown opens vertically
- [ ] Click outside → closes

**Feature 1 (hero image):**
- [ ] Open About section → "Hero banner image" upload area present below Theme section
- [ ] Upload an image → preview thumbnail + "Show avatar in hero" checkbox appears
- [ ] Preview → full-width hero image with gradient overlay, name/tagline at bottom
- [ ] Check/uncheck "Show avatar in hero" → avatar appears/disappears in preview

**Feature 2 (sub-pages):**
- [ ] Hover a non-About sidebar section → "Own page" checkbox visible
- [ ] Check "Own page" on Gallery → preview
- [ ] `index.html` loads: has bio, other sections, and a "My Pages" card for Gallery
- [ ] Click the Gallery card → `gallery.html` opens with minimal header "← [Name]'s Portfolio"
- [ ] Gallery nav link on landing page shows ↗
