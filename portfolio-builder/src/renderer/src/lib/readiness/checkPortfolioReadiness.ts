import type {
  BlueprintItem,
  ContentBlock,
  MediaItem,
  Portfolio,
  Section,
  VideoItem,
} from '../../types/portfolio'

export type ReadinessSeverity = 'error' | 'warning'

export interface ReadinessItem {
  id: string
  severity: ReadinessSeverity
  sectionId?: string
  message: string
}

export interface ReadinessResult {
  ready: boolean
  errorCount: number
  warningCount: number
  items: ReadinessItem[]
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function stripHtml(value: string | undefined): string {
  return value?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() ?? ''
}

function hasRichText(value: string | undefined): boolean {
  return stripHtml(value).length > 0
}

function hasMediaDescription(item: MediaItem | VideoItem): boolean {
  return hasText(item.alt) || hasText(item.caption)
}

function hasValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}

function pushItem(
  items: ReadinessItem[],
  severity: ReadinessSeverity,
  message: string,
  sectionId?: string,
) {
  items.push({
    id: `${sectionId ?? 'portfolio'}-${items.length}`,
    severity,
    sectionId,
    message,
  })
}

function checkMediaItems(items: ReadinessItem[], section: Section, mediaItems: MediaItem[]) {
  for (const item of mediaItems) {
    if (!hasMediaDescription(item)) {
      pushItem(items, 'warning', `${section.title} image "${item.filename}" is missing alt text.`, section.id)
    }
  }
}

function checkContentBlocks(items: ReadinessItem[], section: Section, blocks: ContentBlock[]) {
  for (const block of blocks) {
    if (block.type === 'image' && !hasText(block.alt) && !hasText(block.caption)) {
      pushItem(items, 'warning', `${section.title} image "${block.filename}" is missing alt text.`, section.id)
    }
    if (block.type === 'video' && block.embedUrl && !hasValidUrl(block.embedUrl)) {
      pushItem(items, 'error', `${section.title} has an invalid video URL: ${block.embedUrl}`, section.id)
    }
  }
}

function visibleSectionHasContent(section: Section): boolean {
  switch (section.type) {
    case 'about':
      return hasText(section.bio)
    case 'custom':
      return hasRichText(section.html)
    case 'project':
      return hasRichText(section.description) || Boolean(section.coverImageFilename) || section.items.length > 0
    case 'embed':
      return hasText(section.url)
    case 'content':
      return section.blocks.length > 0
    case 'gallery':
    case 'videos':
    case 'models':
    case 'games':
    case 'code':
    case 'links':
    case 'skills':
    case 'timeline':
    case 'quote':
    case 'stats':
    case 'buttons':
    case 'blueprints':
      return section.items.length > 0
  }
}

function checkSection(items: ReadinessItem[], section: Section) {
  if (!section.visible) return

  if (!visibleSectionHasContent(section)) {
    const severity: ReadinessSeverity = section.type === 'about' ? 'error' : 'warning'
    const message = section.type === 'about'
      ? `${section.title} needs a short bio.`
      : `${section.title} is visible but has no items.`
    pushItem(items, severity, message, section.id)
  }

  switch (section.type) {
    case 'gallery':
    case 'models':
      checkMediaItems(items, section, section.items)
      break
    case 'videos':
      for (const item of section.items) {
        if (item.embedUrl && !hasValidUrl(item.embedUrl)) {
          pushItem(items, 'error', `${section.title} has an invalid video URL: ${item.embedUrl}`, section.id)
        }
        if (item.filename && !hasMediaDescription(item)) {
          pushItem(items, 'warning', `${section.title} video "${item.filename}" is missing a caption.`, section.id)
        }
      }
      break
    case 'project':
      if (section.coverImageFilename && !hasRichText(section.description)) {
        pushItem(items, 'warning', `${section.title} cover image should have supporting text in the description.`, section.id)
      }
      checkMediaItems(items, section, section.items)
      break
    case 'links':
    case 'buttons':
      for (const item of section.items) {
        if (!hasValidUrl(item.url)) {
          pushItem(items, 'error', `${section.title} has an invalid URL: ${item.url}`, section.id)
        }
      }
      break
    case 'embed':
      if (section.url && !hasValidUrl(section.url)) {
        pushItem(items, 'error', `${section.title} has an invalid embed URL: ${section.url}`, section.id)
      }
      if (section.url && !hasText(section.embedTitle)) {
        pushItem(items, 'warning', `${section.title} should include an iframe title for screen readers.`, section.id)
      }
      break
    case 'content':
      checkContentBlocks(items, section, section.blocks)
      break
    case 'blueprints':
      for (const item of section.items as BlueprintItem[]) {
        if (item.kind === 'image' && !hasText(item.label)) {
          pushItem(items, 'warning', `${section.title} blueprint image "${item.content}" should have a label.`, section.id)
        }
      }
      break
  }
}

export function checkPortfolioReadiness(portfolio: Portfolio): ReadinessResult {
  const items: ReadinessItem[] = []

  if (!hasText(portfolio.name)) {
    pushItem(items, 'error', 'Portfolio name is missing.')
  }

  for (const section of portfolio.sections) {
    checkSection(items, section)
    if (section.type === 'about' && !hasText(portfolio.tagline)) {
      pushItem(items, 'warning', 'Add a tagline so the hero area explains what this portfolio is about.', section.id)
    }
  }

  const errorCount = items.filter(item => item.severity === 'error').length
  const warningCount = items.filter(item => item.severity === 'warning').length

  return {
    ready: errorCount === 0,
    errorCount,
    warningCount,
    items,
  }
}
