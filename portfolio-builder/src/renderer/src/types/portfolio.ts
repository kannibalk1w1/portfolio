export type SectionType = 'about' | 'gallery' | 'videos' | 'models' | 'games' | 'code' | 'custom' | 'project' | 'links'

export type ThemeName = 'launchpad' | 'midnight' | 'warm' | 'minimal'

export interface MediaItem {
  id: string
  filename: string       // relative to assets/
  caption?: string
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

export interface ProjectSection extends BaseSection {
  type: 'project'
  description: string   // TipTap HTML
  coverImageFilename?: string
  items: MediaItem[]    // project screenshots/images
}

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

export interface Portfolio {
  schemaVersion: 1
  name: string
  slug: string
  theme?: ThemeName
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

export interface SnapshotMeta {
  id: string
  createdAt: string
}
