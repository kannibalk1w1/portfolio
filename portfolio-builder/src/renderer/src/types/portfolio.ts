export type SectionType = 'about' | 'gallery' | 'videos' | 'models' | 'games' | 'code' | 'custom'

export interface MediaItem {
  id: string
  filename: string       // relative to assets/
  caption?: string
}

export interface VideoItem extends MediaItem {
  thumbnailFilename?: string  // relative to assets/
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
  items: MediaItem[]
}

export interface VideosSection extends BaseSection {
  type: 'videos'
  items: VideoItem[]
}

export interface ModelsSection extends BaseSection {
  type: 'models'
  items: ModelItem[]
}

export interface GamesSection extends BaseSection {
  type: 'games'
  items: GameItem[]
}

export interface CodeSection extends BaseSection {
  type: 'code'
  items: CodeItem[]
}

export interface CustomSection extends BaseSection {
  type: 'custom'
  html: string           // TipTap outputs HTML
}

export type Section =
  | AboutSection
  | GallerySection
  | VideosSection
  | ModelsSection
  | GamesSection
  | CodeSection
  | CustomSection

export interface FtpConfig {
  host: string
  port: number
  user: string
  password?: string
  remotePath: string
  secure: boolean
}

export interface Portfolio {
  schemaVersion: 1
  name: string
  slug: string
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
