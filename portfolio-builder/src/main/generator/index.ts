import { cp, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { Portfolio, Section } from '../../renderer/src/types/portfolio'
import { wrapTemplate } from './template'
import { renderAbout } from './sections/about'
import { renderGallery } from './sections/gallery'
import { renderVideos } from './sections/videos'
import { renderModels } from './sections/models'
import { renderGames } from './sections/games'
import { renderCode } from './sections/code'
import { renderCustom } from './sections/custom'
import { renderProject } from './sections/project'

function renderSection(section: Section): string {
  switch (section.type) {
    case 'about':   return renderAbout(section)
    case 'gallery': return renderGallery(section)
    case 'videos':  return renderVideos(section)
    case 'models':  return renderModels(section)
    case 'games':   return renderGames(section)
    case 'code':    return renderCode(section)
    case 'custom':  return renderCustom(section)
    case 'project': return renderProject(section)
  }
}

// Vendor scripts ship with the Electron app in the renderer assets.
// At build time, electron-vite copies src/renderer/assets/ into the output bundle.
// We resolve relative to this file's location at runtime.
function getVendorSourceDir(): string | null {
  const candidates = [
    // Dev mode: __dirname = out/main/, source files are at src/renderer/
    join(__dirname, '..', '..', 'src', 'renderer', 'assets', 'vendor'),
    join(__dirname, '..', '..', 'src', 'renderer', 'public', 'vendor'),
    // Production: compiled renderer assets
    join(__dirname, '..', '..', 'renderer', 'assets', 'vendor'),
    join(__dirname, '..', 'renderer', 'assets', 'vendor'),
    // Packaged app
    join(process.resourcesPath ?? '', 'app', 'renderer', 'assets', 'vendor'),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return null
}

export async function buildSite(portfolioDir: string, portfolio: Portfolio): Promise<void> {
  const outputDir = join(portfolioDir, 'output')
  const outputAssets = join(outputDir, 'assets')
  await mkdir(outputAssets, { recursive: true })

  // Copy media assets
  await cp(join(portfolioDir, 'assets'), outputAssets, { recursive: true }).catch(() => {})

  // Copy vendor scripts if available
  const vendorDest = join(outputAssets, 'vendor')
  await mkdir(vendorDest, { recursive: true })
  const vendorSrc = getVendorSourceDir()
  if (vendorSrc) {
    await cp(vendorSrc, vendorDest, { recursive: true }).catch(err => {
      console.warn('Warning: failed to copy vendor scripts:', err.message)
    })
  } else {
    console.warn('Warning: vendor scripts directory not found — model-viewer and highlight.js will not be available in the exported site')
  }

  // Render sections
  const body = portfolio.sections
    .filter(s => s.visible)
    .map(renderSection)
    .join('\n')

  const html = wrapTemplate(portfolio, body)
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8')
}
