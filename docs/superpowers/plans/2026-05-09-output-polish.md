# Output Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Open Graph + Twitter Card meta tags to the generated portfolio site, and add `loading="lazy" decoding="async"` to every `<img>` emitted by the generator.

**Architecture:** Pure additions to the static site generator. New conditional meta tags inside the existing `<head>` block in `template.ts`; new attributes inside the existing `<img>` tags in four section files. No new files except a small `truncate` helper kept local to `template.ts`. No portfolio-shape changes, no IPC, no UI, no new dependencies.

**Tech Stack:** TypeScript, Vitest (already configured for the `main` test project, environment: node).

**Spec:** [`docs/superpowers/specs/2026-05-09-output-polish-design.md`](../specs/2026-05-09-output-polish-design.md)

---

## File Map

```
portfolio-builder/
├── src/main/generator/
│   ├── template.ts                        # add OG/Twitter meta tags + truncate helper
│   └── sections/
│       ├── about.ts                       # add loading="lazy" decoding="async" to avatar
│       ├── gallery.ts                     # add decoding="async" (loading="lazy" already present)
│       └── project.ts                     # add lazy/async to cover; add decoding="async" to gallery item
└── tests/main/generator/
    └── index.test.ts                      # extend with OG/Twitter + lazy/async assertions
```

Each task ships a self-contained increment of behaviour. The four tasks are independent — they could land as four separate commits or be squashed at PR time.

---

## Task 1: Always-on OG / Twitter meta tags

**Files:**
- Modify: `portfolio-builder/src/main/generator/template.ts` (the `<head>` block, around line 35-40)
- Test: `portfolio-builder/tests/main/generator/index.test.ts`

- [ ] **Step 1: Write the failing test**

Append this test inside the `describe('buildSite', () => { ... })` block in `portfolio-builder/tests/main/generator/index.test.ts`:

```ts
  it('emits the always-on Open Graph and Twitter meta tags', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain(`<meta property="og:title" content="Alice&#39;s Portfolio">`)
    expect(html).toContain(`<meta property="og:type" content="profile">`)
    expect(html).toContain(`<meta property="og:site_name" content="Alice&#39;s Portfolio">`)
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image">`)
    expect(html).toContain(`<meta name="twitter:title" content="Alice&#39;s Portfolio">`)
  })
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd portfolio-builder
npx vitest run tests/main/generator/index.test.ts -t "always-on Open Graph"
```
Expected: FAIL with multiple `expected '...' to contain '<meta property="og:title"...'` assertion errors.

- [ ] **Step 3: Add the always-on tags to template.ts**

In `portfolio-builder/src/main/generator/template.ts`, locate the `<head>` block. Replace:

```ts
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(portfolio.name)}'s Portfolio</title>
  ${modelViewerScript}
  ${highlightLinks}
```

…with:

```ts
  const siteTitle = `${portfolio.name}'s Portfolio`
  const escSiteTitle = escHtml(siteTitle)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escSiteTitle}</title>
  <meta property="og:title" content="${escSiteTitle}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${escSiteTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escSiteTitle}">
  ${modelViewerScript}
  ${highlightLinks}
```

- [ ] **Step 4: Run the new test to verify it passes**

```bash
npx vitest run tests/main/generator/index.test.ts -t "always-on Open Graph"
```
Expected: PASS.

- [ ] **Step 5: Run the full generator suite to verify no regressions**

```bash
npx vitest run tests/main/generator
```
Expected: 5 tests pass (the existing 4 + the new one).

- [ ] **Step 6: Commit**

```bash
git add portfolio-builder/src/main/generator/template.ts portfolio-builder/tests/main/generator/index.test.ts
git commit -m "feat(generator): add always-on Open Graph and Twitter meta tags

Emits og:title, og:type, og:site_name, twitter:card, and twitter:title
on every generated portfolio site. Conditional tags (og:image,
og:description and their twitter: pairs) follow in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Conditional `og:image` / `twitter:image` (avatar-based)

**Files:**
- Modify: `portfolio-builder/src/main/generator/template.ts`
- Test: `portfolio-builder/tests/main/generator/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/main/generator/index.test.ts` inside the same `describe` block:

```ts
  it('emits og:image and twitter:image when the About section has an avatar', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: 'Hello world', avatarFilename: 'avatar.jpg' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain(`<meta property="og:image" content="assets/avatar.jpg">`)
    expect(html).toContain(`<meta name="twitter:image" content="assets/avatar.jpg">`)
  })

  it('omits og:image and twitter:image when no avatar is set', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('twitter:image')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/main/generator/index.test.ts -t "image"
```
Expected: the `emits og:image…` test FAILs (substring missing); the `omits og:image…` test PASSes vacuously (still good — locks in the absence behaviour).

- [ ] **Step 3: Add the conditional image tags to template.ts**

In `portfolio-builder/src/main/generator/template.ts`, just below the existing block that extracts `bio` from the about section, add:

```ts
  const aboutSection = portfolio.sections.find(s => s.type === 'about')
  const bio = aboutSection?.type === 'about' ? aboutSection.bio : ''
  const avatarFilename = aboutSection?.type === 'about' ? aboutSection.avatarFilename : undefined
  const ogImage = avatarFilename
    ? `<meta property="og:image" content="assets/${escHtml(avatarFilename)}">
  <meta name="twitter:image" content="assets/${escHtml(avatarFilename)}">`
    : ''
```

(Replace the existing two-line `aboutSection` / `bio` declaration with the four lines above so we don't shadow.)

Then, inside the returned template literal, insert `${ogImage}` immediately after the `twitter:title` line:

```ts
  <meta name="twitter:title" content="${escSiteTitle}">
  ${ogImage}
  ${modelViewerScript}
  ${highlightLinks}
```

- [ ] **Step 4: Run the new tests to verify they pass**

```bash
npx vitest run tests/main/generator/index.test.ts -t "image"
```
Expected: both PASS.

- [ ] **Step 5: Run the full generator suite**

```bash
npx vitest run tests/main/generator
```
Expected: 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add portfolio-builder/src/main/generator/template.ts portfolio-builder/tests/main/generator/index.test.ts
git commit -m "feat(generator): emit og:image and twitter:image when avatar is set

Tags reference 'assets/\${avatarFilename}' relatively. When loaded over
HTTP, OG consumers resolve relative paths against og:url (or the page
URL when og:url is omitted, which matches our current behaviour).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Conditional `og:description` / `twitter:description` with truncation

**Files:**
- Modify: `portfolio-builder/src/main/generator/template.ts`
- Test: `portfolio-builder/tests/main/generator/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the same `describe` block in `tests/main/generator/index.test.ts`:

```ts
  it('emits og:description and twitter:description when bio is non-empty', async () => {
    await buildSite(TMP, basicPortfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    // basicPortfolio bio is 'Hello world'
    expect(html).toContain(`<meta property="og:description" content="Hello world">`)
    expect(html).toContain(`<meta name="twitter:description" content="Hello world">`)
  })

  it('omits og:description / twitter:description when bio is empty or whitespace', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: '   ' },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('twitter:description')
  })

  it('truncates og:description to 200 characters with an ellipsis when bio is longer', async () => {
    const longBio = 'A'.repeat(250)
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'about', type: 'about', title: 'About Me', visible: true, bio: longBio },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    const match = html.match(/<meta property="og:description" content="([^"]*)">/)
    expect(match).not.toBeNull()
    const content = match![1]
    expect(content.length).toBe(200)
    expect(content.endsWith('…')).toBe(true)
  })

  it('emits only always-on tags when there is no About section at all', async () => {
    const portfolio: Portfolio = {
      ...basicPortfolio,
      sections: [
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [] },
      ],
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')
    expect(html).toContain('og:title')
    expect(html).toContain('twitter:card')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('twitter:image')
    expect(html).not.toContain('twitter:description')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/main/generator/index.test.ts -t "description"
npx vitest run tests/main/generator/index.test.ts -t "no About section"
```
Expected: the `emits og:description…` and `truncates…` tests FAIL; the `omits…` and `no About section` tests likely PASS vacuously today.

- [ ] **Step 3: Add the truncate helper at the top of template.ts**

In `portfolio-builder/src/main/generator/template.ts`, after the imports and before `function buildNavLinks`, add:

```ts
function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}
```

- [ ] **Step 4: Add the conditional description tags to template.ts**

In `template.ts`, where you added `ogImage` in Task 2, add the description block right next to it:

```ts
  const ogDescription = bio.trim()
    ? (() => {
        const desc = escHtml(truncate(bio, 200))
        return `<meta property="og:description" content="${desc}">
  <meta name="twitter:description" content="${desc}">`
      })()
    : ''
```

Then, inside the returned template literal, insert `${ogDescription}` between `${ogImage}` and `${modelViewerScript}`:

```ts
  <meta name="twitter:title" content="${escSiteTitle}">
  ${ogImage}
  ${ogDescription}
  ${modelViewerScript}
  ${highlightLinks}
```

- [ ] **Step 5: Run all the new tests**

```bash
npx vitest run tests/main/generator/index.test.ts -t "description"
npx vitest run tests/main/generator/index.test.ts -t "no About section"
```
Expected: all four PASS.

- [ ] **Step 6: Run the full generator suite**

```bash
npx vitest run tests/main/generator
```
Expected: 11 tests pass.

- [ ] **Step 7: Commit**

```bash
git add portfolio-builder/src/main/generator/template.ts portfolio-builder/tests/main/generator/index.test.ts
git commit -m "feat(generator): emit og:description / twitter:description with truncation

Description is sourced from the About-section bio, truncated to 200
characters with a trailing ellipsis when longer (Open Graph soft limit;
Twitter's hard limit is 200). Empty or whitespace-only bios skip the
tag entirely. Portfolios without an About section emit only the
always-on tags from the previous commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `loading="lazy" decoding="async"` on every `<img>`

**Files:**
- Modify: `portfolio-builder/src/main/generator/sections/about.ts`
- Modify: `portfolio-builder/src/main/generator/sections/gallery.ts`
- Modify: `portfolio-builder/src/main/generator/sections/project.ts`
- Test: `portfolio-builder/tests/main/generator/index.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the same `describe` block in `tests/main/generator/index.test.ts`:

```ts
  it('every <img> in the rendered output has loading="lazy" and decoding="async"', async () => {
    const portfolio: Portfolio = {
      schemaVersion: 1,
      name: 'Alice',
      slug: 'alice',
      sections: [
        { id: 'about', type: 'about', title: 'About', visible: true, bio: 'b', avatarFilename: 'avatar.jpg' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery', visible: true, items: [
          { id: 'g1', filename: 'one.jpg' },
        ]},
        { id: 'project-1', type: 'project', title: 'Project', visible: true, description: '', coverImageFilename: 'cover.jpg', items: [
          { id: 'p1', filename: 'screenshot.jpg' },
        ]},
      ],
      publish: {},
    }
    await buildSite(TMP, portfolio)
    const html = readFileSync(join(TMP, 'output', 'index.html'), 'utf-8')

    const imgs = html.match(/<img\b[^>]*>/g) ?? []
    expect(imgs.length).toBeGreaterThanOrEqual(3) // avatar + gallery item + cover + project gallery item
    for (const tag of imgs) {
      expect(tag).toMatch(/\bloading="lazy"/)
      expect(tag).toMatch(/\bdecoding="async"/)
    }
  })
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/main/generator/index.test.ts -t "every <img>"
```
Expected: FAIL — the avatar `<img>` and the project cover `<img>` lack both attributes; the gallery `<img>` and project gallery `<img>` lack `decoding="async"`.

- [ ] **Step 3: Update `about.ts`**

In `portfolio-builder/src/main/generator/sections/about.ts`, replace:

```ts
  const avatar = section.avatarFilename
    ? `<img src="assets/${escHtml(section.avatarFilename)}" class="avatar" alt="Avatar">`
    : ''
```

…with:

```ts
  const avatar = section.avatarFilename
    ? `<img src="assets/${escHtml(section.avatarFilename)}" class="avatar" alt="Avatar" loading="lazy" decoding="async">`
    : ''
```

- [ ] **Step 4: Update `gallery.ts`**

In `portfolio-builder/src/main/generator/sections/gallery.ts`, replace:

```ts
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy">
```

…with:

```ts
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy" decoding="async">
```

- [ ] **Step 5: Update `project.ts`**

In `portfolio-builder/src/main/generator/sections/project.ts`, make two edits.

First, replace the cover line:

```ts
  const cover = section.coverImageFilename
    ? `<img src="assets/${escHtml(section.coverImageFilename)}" class="project-cover" alt="Cover image">`
    : ''
```

…with:

```ts
  const cover = section.coverImageFilename
    ? `<img src="assets/${escHtml(section.coverImageFilename)}" class="project-cover" alt="Cover image" loading="lazy" decoding="async">`
    : ''
```

Second, replace the project gallery item line:

```ts
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy">
```

…with:

```ts
        <img src="assets/${escHtml(item.filename)}" alt="${escHtml(item.caption ?? item.filename)}" loading="lazy" decoding="async">
```

- [ ] **Step 6: Run the new test**

```bash
npx vitest run tests/main/generator/index.test.ts -t "every <img>"
```
Expected: PASS.

- [ ] **Step 7: Run the full generator suite**

```bash
npx vitest run tests/main/generator
```
Expected: 12 tests pass (4 original + 1 from Task 1 + 2 from Task 2 + 4 from Task 3 + 1 from Task 4).

- [ ] **Step 8: Run the entire test suite + typecheck**

```bash
cd portfolio-builder
npm run typecheck
npm test
```
Expected: typecheck clean; all tests pass.

- [ ] **Step 9: Commit**

```bash
git add portfolio-builder/src/main/generator/sections/about.ts portfolio-builder/src/main/generator/sections/gallery.ts portfolio-builder/src/main/generator/sections/project.ts portfolio-builder/tests/main/generator/index.test.ts
git commit -m "feat(generator): add loading=lazy + decoding=async to every <img>

Extends the existing loading=lazy on gallery and project-gallery items
to the avatar and project cover images, and adds decoding=async on every
<img> the generator emits. loading=lazy is a hint for above-the-fold
images, so the avatar and cover are no worse off; below-the-fold gets
the deferred decode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Covered in |
|---|---|
| `loading="lazy" decoding="async"` on avatar | Task 4 (about.ts edit) |
| `loading="lazy" decoding="async"` on gallery items | Task 4 (gallery.ts edit) |
| `loading="lazy" decoding="async"` on project cover | Task 4 (project.ts cover edit) |
| `loading="lazy" decoding="async"` on project gallery items | Task 4 (project.ts gallery item edit) |
| Always-on `og:title` / `og:type` / `og:site_name` | Task 1 |
| Always-on `twitter:card` / `twitter:title` | Task 1 |
| Conditional `og:image` / `twitter:image` (avatar) | Task 2 |
| Conditional `og:description` / `twitter:description` (bio) | Task 3 |
| Description truncated to 200 with `…` | Task 3 (truncate helper + test) |
| `og:url` *not* emitted | Implicit — never added in any task |
| Test: OG title always present | Task 1 test |
| Test: OG image conditional on avatar | Task 2 tests (positive + negative) |
| Test: OG description conditional on bio | Task 3 tests (positive + negative) |
| Test: description truncation behaviour | Task 3 truncation test |
| Test: every `<img>` has lazy + async | Task 4 test |
| Test: no About section case | Task 3 final test |

All spec items covered.

**Placeholder scan:** No "TBD", "TODO", "implement later", "similar to". Every code step shows the actual code.

**Type / name consistency:**
- `escSiteTitle` defined in Task 1, reused in Tasks 2 and 3 (no rename).
- `aboutSection` / `bio` / `avatarFilename` extracted once in Task 2, reused in Task 3.
- `truncate` helper signature `(text: string, max: number) => string` consistent with usage `truncate(bio, 200)`.
- `ogImage` / `ogDescription` strings produced in Tasks 2 and 3, consumed in the same `<head>` block.

**Test count check:** Started at 4. Task 1 adds 1, Task 2 adds 2, Task 3 adds 4, Task 4 adds 1 → 12 total at end. Step 7 of Task 4 expects 12. Consistent.
