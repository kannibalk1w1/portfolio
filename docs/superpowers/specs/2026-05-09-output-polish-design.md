# Output Polish — Design Spec
**Date:** 2026-05-09

## Overview

Two complementary additions to the static site generator that improve how the published portfolio is loaded by browsers and previewed when shared on social platforms:

1. **Lazy + async-decode on every `<img>`** — extends the existing `loading="lazy"` (today on gallery and project gallery items) to the avatar and project cover, and adds `decoding="async"` everywhere images are emitted.
2. **Open Graph + Twitter Card meta tags** — added to the generated `<head>` so a link to a published portfolio renders a rich preview on Slack, Discord, Mastodon, BlueSky, Twitter, etc.

Both changes are pure additions to the generator output. No portfolio-shape changes, no UI changes, no IPC changes, no new dependencies.

## Non-goals (deliberate)

- **`og:url`.** Requires a canonical published URL, which means either a new `publishedUrl` field on the portfolio or deriving from FTP config (host + remotePath). Punted to a follow-up — most consumers default `og:url` to the page's current URL when the tag is omitted, so the absence is graceful.
- **Dedicated social-cover image.** Would need a portfolio-shape change (`socialCoverFilename`) and a UI control to pick it. Avatar fallback covers the 80% case.
- **Lazy loading for `<video>` or `<model-viewer>`.** `<video>` already uses `preload="metadata"` (loads dimensions only); `<model-viewer>` has its own loading attribute that's not equivalent to `loading="lazy"`. Out of scope.

## Changes

### 1. Lazy + async-decode on images

| File | Image | Today | After |
|---|---|---|---|
| `src/main/generator/sections/about.ts` | avatar | none | `loading="lazy" decoding="async"` |
| `src/main/generator/sections/gallery.ts` | gallery item | `loading="lazy"` | `loading="lazy" decoding="async"` |
| `src/main/generator/sections/project.ts` | project cover | none | `loading="lazy" decoding="async"` |
| `src/main/generator/sections/project.ts` | project gallery item | `loading="lazy"` | `loading="lazy" decoding="async"` |

Sections that emit no `<img>` (videos, models, code, custom, games) are unchanged.

`loading="lazy"` on an above-the-fold image (avatar, project cover) is at worst neutral — modern browsers (Chrome, Firefox, Safari ≥15.4) treat it as a hint rather than a directive and load the image immediately if it's in the viewport at parse time.

### 2. Open Graph + Twitter Card meta tags

Added to the `<head>` block in `src/main/generator/template.ts`, between `<title>` and the optional `modelViewerScript`/`highlightLinks`. All tags are conditionally emitted; nothing forces a CYP to fill out social fields.

```html
<meta property="og:title" content="{{name}}'s Portfolio">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="{{name}}'s Portfolio">
<meta property="og:image" content="assets/{{avatarFilename}}">       <!-- only if avatarFilename set -->
<meta property="og:description" content="{{bio truncated to 200 chars}}"> <!-- only if bio non-empty -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{name}}'s Portfolio">
<meta name="twitter:description" content="...">                       <!-- if bio -->
<meta name="twitter:image" content="assets/{{avatarFilename}}">       <!-- if avatar -->
```

#### Source rules

- `og:title` / `twitter:title` — always emitted: `${portfolio.name}'s Portfolio` (matches the existing `<title>`).
- `og:type` — always `profile` (per OG spec, individuals).
- `og:site_name` — always emitted: `${portfolio.name}'s Portfolio`.
- `og:image` / `twitter:image` — only if an About section exists *and* `avatarFilename` is set on it. Path `assets/${avatarFilename}` (relative). When the published site is loaded over HTTP/HTTPS, OG consumers resolve the relative path against `og:url` (defaulted to current URL by every major consumer when `og:url` itself is unset).
- `og:description` / `twitter:description` — only if an About section exists *and* its `bio` is non-empty after trim. Truncated to 200 chars max with a trailing `…` if longer (Open Graph soft limit; Twitter's hard limit is 200).
- If no About section exists at all, all conditional tags are skipped; only the always-emitted ones (`og:title`, `og:type`, `og:site_name`, `twitter:card`, `twitter:title`) appear.
- `twitter:card` — always `summary_large_image` (renders well for both square avatars and wider images future-proofing for a dedicated social cover).

#### Escaping

All values pass through the existing `escHtml` helper before injection. `escHtml` covers `&<>"'` which is the minimum for HTML attribute escaping. The bio is plain text per the `AboutSection` type (`bio: string`, not HTML).

#### Truncation

A small helper local to `template.ts`:

```ts
function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}
```

The `max - 1` accounts for the `…` character so the total length stays at or below 200.

## Tests

Extends `tests/main/generator/index.test.ts` (4 tests today). The existing tests already construct full portfolios and snapshot the generator output — new assertions hang off the same fixtures.

New cases:

| Case | Input | Assertion |
|---|---|---|
| OG title always present | any portfolio | `<meta property="og:title" content="X's Portfolio">` in output |
| OG image emitted iff avatar set | About with `avatarFilename` | `og:image` and `twitter:image` reference `assets/${avatar}` |
| OG image omitted when no avatar | About with no avatar | output contains no `og:image` / `twitter:image` substrings |
| OG description emitted iff bio set | About with bio | `og:description` and `twitter:description` contain bio (escaped) |
| OG description omitted when no bio | About with empty bio | output contains no `og:description` / `twitter:description` |
| Description truncation | bio length 250 | `og:description` content length is exactly 200 and ends with `…` |
| Twitter card type | any portfolio | `<meta name="twitter:card" content="summary_large_image">` present |
| Lazy + async on every img | portfolio with avatar + gallery + project cover | every `<img>` matched in the rendered HTML carries both `loading="lazy"` and `decoding="async"` (regex sweep — assertion holds vacuously if no `<img>` is rendered, but the fixture is constructed to emit at least three) |
| No About section | portfolio with no About | output emits the always-on tags only; no `og:image` / `og:description` / `twitter:image` / `twitter:description` substrings |

## Files touched

- `src/main/generator/template.ts` — add OG/Twitter tags to `<head>`, add `truncate` helper.
- `src/main/generator/sections/about.ts` — add `loading="lazy" decoding="async"` to avatar.
- `src/main/generator/sections/gallery.ts` — add `decoding="async"` to gallery item.
- `src/main/generator/sections/project.ts` — add lazy/async to cover; add `decoding="async"` to project gallery item.
- `tests/main/generator/index.test.ts` — extend with the assertions above.

## Risk and rollback

- Risk is contained to generator output. No data model changes, no IPC changes, no migration, no dependencies added.
- A regression in the generator manifests as broken HTML in `output/index.html` for new portfolios; the existing snapshot system preserves any prior generated output.
- Rollback: `git revert` reverts the generator change cleanly with no data implications.

## Out of scope follow-ups

These are intentional gaps in this design that may justify their own PRs later:

- **`og:url`** + a `publishedUrl` field (or derive from FTP config).
- **Dedicated social-cover image** field with a UI control.
- **JSON-LD structured data** (`@type: Person`) for richer search-engine cards.
- **Theme-color meta** tag (`<meta name="theme-color">`) once theming lands.
