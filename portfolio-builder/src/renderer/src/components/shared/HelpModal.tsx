import { useEffect } from 'react'

export interface SectionHelpEntry {
  type: string
  icon: string
  name: string
  description: string
  example: string
  accepts?: string
}

export const SECTION_HELP: SectionHelpEntry[] = [
  {
    type: 'about',
    icon: '👤',
    name: 'About Me',
    description: 'Introduce yourself — your name, what you\'re into, and a bit about you.',
    example: '"I\'m 16, I love making games and 3D art…"',
    accepts: 'Avatar: JPG, PNG, GIF, WEBP · Hero banner: JPG, PNG, WEBP, AVIF, HEIC, TIFF',
  },
  {
    type: 'gallery',
    icon: '🖼',
    name: 'Gallery',
    description: 'Show images and GIFs in a grid.',
    example: 'Screenshots of your Godot project, art you\'ve made, photos of things you\'ve built',
    accepts: 'JPG, PNG, GIF, WEBP, SVG, AVIF, HEIC, TIFF',
  },
  {
    type: 'videos',
    icon: '🎬',
    name: 'Videos',
    description: 'Upload video files or paste a YouTube/Vimeo link.',
    example: 'A playthrough of your game, a timelapse of your build, a short film',
    accepts: 'MP4, WEBM, MOV, M4V',
  },
  {
    type: 'models',
    icon: '📦',
    name: '3D Models',
    description: 'Display interactive 3D models you can rotate in the browser.',
    example: 'A character model from Blender, a level asset, a prop you designed',
    accepts: 'GLB, GLTF, FBX, STL, OBJ, PLY, 3DS',
  },
  {
    type: 'games',
    icon: '🎮',
    name: 'Games',
    description: 'Display a playable Godot HTML5 game export directly in your portfolio.',
    example: 'Your finished game, a prototype, a game jam entry',
    accepts: 'Godot HTML5 export folder (File → Export → Web in Godot)',
  },
  {
    type: 'code',
    icon: '💻',
    name: 'Code',
    description: 'Show syntax-highlighted code snippets with labels.',
    example: 'A GDScript function, a Python script, a shader you wrote',
  },
  {
    type: 'blueprints',
    icon: '⬡',
    name: 'Blueprints',
    description: 'Display Unreal Engine Blueprint node graphs — paste copy-text or upload a screenshot.',
    example: 'A character movement Blueprint, an interaction system',
    accepts: 'Paste: copy nodes in UE (Ctrl+C) · Screenshot: JPG, PNG, GIF, WEBP',
  },
  {
    type: 'custom',
    icon: '📝',
    name: 'Text',
    description: 'A freeform rich-text block — write anything.',
    example: 'A reflection on what you learned, a blog post, a short story',
  },
  {
    type: 'project',
    icon: '📋',
    name: 'Project',
    description: 'Document a whole project with a cover image, description, and screenshots.',
    example: '"My first Godot game — what I made, how I made it, what I\'d do differently"',
    accepts: 'JPG, PNG, GIF, WEBP, AVIF, HEIC, TIFF',
  },
  {
    type: 'links',
    icon: '🔗',
    name: 'Links',
    description: 'A row of labelled links to external sites.',
    example: 'Your itch.io page, GitHub, ArtStation',
  },
  {
    type: 'skills',
    icon: '⭐',
    name: 'Skills',
    description: 'Show skills as coloured badge tags.',
    example: 'Blender, GDScript, Pixel Art, Team Leadership',
  },
  {
    type: 'timeline',
    icon: '📅',
    name: 'Timeline',
    description: 'A vertical timeline of events or milestones.',
    example: '"Jan 2025 — finished first game", "Mar 2025 — joined Player Ready"',
  },
  {
    type: 'quote',
    icon: '❝',
    name: 'Quote',
    description: 'One or more pull-quotes with attribution.',
    example: 'A quote from a mentor, something that inspired you',
  },
  {
    type: 'embed',
    icon: '📡',
    name: 'Embed',
    description: 'Display any website or tool inline via URL.',
    example: 'A Scratch project, a Google Slides presentation, a Figma file',
  },
  {
    type: 'content',
    icon: '🧩',
    name: 'Content',
    description: 'A flexible block editor — mix text, images, video, quotes, two-column layouts, and progress bars.',
    example: 'A project writeup with images and a skills progress bar',
    accepts: 'Images: JPG, PNG, GIF, WEBP, HEIC · Video: MP4, WEBM',
  },
  {
    type: 'stats',
    icon: '📊',
    name: 'Stats',
    description: 'Big number callouts for key achievements.',
    example: '"200 hours", "3 games shipped", "1st place"',
  },
  {
    type: 'buttons',
    icon: '🔘',
    name: 'Buttons',
    description: 'Call-to-action buttons linking to external pages.',
    example: '"Play my game", "View my GitHub", "Contact me"',
  },
]

interface Props {
  onClose: () => void
}

export function HelpModal({ onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640,
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', margin: '0 16px',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Section Guide</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 20px 16px' }}>
          {SECTION_HELP.map((entry, i) => (
            <div
              key={entry.type}
              style={{
                padding: '12px 0',
                borderBottom: i < SECTION_HELP.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                {entry.icon} {entry.name}
              </div>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 2 }}>
                {entry.description}
              </div>
              <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: entry.accepts ? 4 : 0 }}>
                e.g. {entry.example}
              </div>
              {entry.accepts && (
                <div style={{ fontSize: 11, color: '#6366f1' }}>
                  <strong>Accepts:</strong> {entry.accepts}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
