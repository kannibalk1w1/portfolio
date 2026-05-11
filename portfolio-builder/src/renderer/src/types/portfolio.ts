export type SectionType = 'about' | 'gallery' | 'videos' | 'models' | 'games' | 'code' | 'custom' | 'project' | 'links' | 'skills' | 'timeline' | 'quote' | 'embed' | 'content' | 'stats' | 'buttons'

export type ThemeName = 'launchpad' | 'midnight' | 'warm' | 'minimal'

export interface MediaItem {
  id: string
  filename: string       // relative to assets/
  caption?: string
  alt?: string           // alt text for screen readers; falls back to caption then filename
}

export interface VideoItem extends MediaItem {
  thumbnailFilename?: string  // relative to assets/
  embedUrl?: string           // YouTube/Vimeo embed URL; when set, filename is unused
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

export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'gdscript' | 'html' | 'css' | 'rust' | 'c' | 'cpp' | 'json' | 'bash' | 'other'

export interface CodeItem {
  id: string
  language: CodeLanguage
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
  description?: string  // rich text HTML
  items: MediaItem[]
}

export interface VideosSection extends BaseSection {
  type: 'videos'
  description?: string
  items: VideoItem[]
}

export interface ModelsSection extends BaseSection {
  type: 'models'
  description?: string
  items: ModelItem[]
}

export interface GamesSection extends BaseSection {
  type: 'games'
  description?: string
  items: GameItem[]
}

export interface CodeSection extends BaseSection {
  type: 'code'
  description?: string
  items: CodeItem[]
}

export interface CustomSection extends BaseSection {
  type: 'custom'
  html: string           // TipTap outputs HTML
}

export interface LinkItem {
  id: string
  url: string
  label: string
  icon: string           // emoji
}

export interface LinksSection extends BaseSection {
  type: 'links'
  description?: string
  items: LinkItem[]
}

export interface SkillItem {
  id: string
  label: string
}

export interface SkillsSection extends BaseSection {
  type: 'skills'
  description?: string
  items: SkillItem[]
}

export interface TimelineItem {
  id: string
  date: string           // e.g. "2026", "May 2026", free text
  title: string
  description?: string
}

export interface TimelineSection extends BaseSection {
  type: 'timeline'
  description?: string
  items: TimelineItem[]
}

export interface ProjectSection extends BaseSection {
  type: 'project'
  description: string   // TipTap HTML
  coverImageFilename?: string
  items: MediaItem[]    // project screenshots/images
}

// ---------------------------------------------------------------------------
// Quote section
// ---------------------------------------------------------------------------

export interface QuoteItem {
  id: string
  quote: string
  attribution?: string
}

export interface QuoteSection extends BaseSection {
  type: 'quote'
  items: QuoteItem[]
}

// ---------------------------------------------------------------------------
// Embed section (generic iframe)
// ---------------------------------------------------------------------------

export interface EmbedSection extends BaseSection {
  type: 'embed'
  description?: string
  url: string
  embedTitle?: string  // optional iframe title attr (distinct from section title)
  height: number       // iframe height in px
}

// ---------------------------------------------------------------------------
// Content section (block editor)
// ---------------------------------------------------------------------------

export interface ContentTextBlock      { id: string; type: 'text';       html: string }
export interface ContentImageBlock     { id: string; type: 'image';      filename: string; caption?: string; alt?: string; objectFit?: 'cover' | 'contain' }
export interface ContentVideoBlock     { id: string; type: 'video';      filename?: string; embedUrl?: string; caption?: string }
export interface ContentQuoteBlock     { id: string; type: 'quote';      quote: string; attribution?: string }
export interface ContentDividerBlock   { id: string; type: 'divider';    style?: 'line' | 'dots' | 'stars' | 'thick' }
export interface ContentTwoColumnBlock { id: string; type: 'two-column'; leftHtml: string; rightHtml: string }
export interface ContentProgressBlock  { id: string; type: 'progress';    label: string; percentage: number; colour?: string }

export type ContentBlock =
  | ContentTextBlock | ContentImageBlock | ContentVideoBlock
  | ContentQuoteBlock | ContentDividerBlock | ContentTwoColumnBlock | ContentProgressBlock

export interface ContentSection extends BaseSection {
  type: 'content'
  blocks: ContentBlock[]
}

// ---------------------------------------------------------------------------
// Stats section
// ---------------------------------------------------------------------------

export interface StatItem {
  id: string
  value: string   // e.g. "200+", "3"
  label: string   // e.g. "Hours", "Projects completed"
}

export interface StatsSection extends BaseSection {
  type: 'stats'
  description?: string
  items: StatItem[]
}

// ---------------------------------------------------------------------------
// Buttons / CTA section
// ---------------------------------------------------------------------------

export type ButtonStyle = 'primary' | 'secondary' | 'outline'

export interface ButtonItem {
  id: string
  label: string
  url: string
  style: ButtonStyle
}

export interface ButtonsSection extends BaseSection {
  type: 'buttons'
  description?: string
  items: ButtonItem[]
}

// ---------------------------------------------------------------------------
// Section union
// ---------------------------------------------------------------------------

export type Section =
  | AboutSection
  | GallerySection
  | VideosSection
  | ModelsSection
  | GamesSection
  | CodeSection
  | CustomSection
  | ProjectSection
  | LinksSection
  | SkillsSection
  | TimelineSection
  | QuoteSection
  | EmbedSection
  | ContentSection
  | StatsSection
  | ButtonsSection

export interface FtpConfig {
  host: string
  port: number
  user: string
  /**
   * Runtime-only. Never written to portfolio.json — the persistence layer
   * strips this field on read and write. Set/cleared via the
   * `setFtpPassword` / `clearFtpPassword` API and stored encrypted via
   * Electron `safeStorage` keyed on the portfolio slug.
   */
  password?: string
  remotePath: string
  secure: boolean
}

/** User-defined overrides applied on top of the chosen theme. */
export interface PortfolioCustomisation {
  accentColour?: string   // hex — overrides --accent / --accent-d
  bgColour?: string       // hex — overrides --bg
  fontFamily?: string     // CSS font-family string
}

export interface Portfolio {
  schemaVersion: 1
  name: string
  slug: string
  tagline?: string
  theme?: ThemeName
  customisation?: PortfolioCustomisation
  sections: Section[]
  publish: {
    ftp?: FtpConfig
  }
}

export interface CypMeta {
  slug: string
  name: string
  lastModified: string   // ISO timestamp
  thumbnailFilename?: string  // relative to the portfolio's assets/ folder
}

export interface SnapshotMeta {
  id: string
  createdAt: string
}
