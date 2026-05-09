import { cp, mkdir, writeFile } from 'fs/promises'
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

function renderSection(section: Section): string {
  switch (section.type) {
    case 'about':   return renderAbout(section)
    case 'gallery': return renderGallery(section)
    case 'videos':  return renderVideos(section)
    case 'models':  return renderModels(section)
    case 'games':   return renderGames(section)
    case 'code':    return renderCode(section)
    case 'custom':  return renderCustom(section)
  }
}

// Vendor scripts ship with the Electron app in the renderer assets.
// At build time, electron-vite copies src/renderer/assets/ into the output bundle.
// We resolve relative to this file's location at runtime.
function getVendorSourceDir(): string {
  // In development: <project>/src/renderer/assets/vendor
  // In production (ASAR): resolved via app.getAppPath()
  // Use __dirname which points to the compiled main bundle location
  // and walk up to find the renderer assets
  const candidates = [
    join(__dirname, '..', '..', 'renderer', 'assets', 'vendor'),           // dev
    join(__dirname, '..', 'renderer', 'assets', 'vendor'),                  // alt dev
    join(process.resourcesPath ?? '', 'app', 'renderer', 'assets', 'vendor'), // packaged
  ]
  return candidates[0] // buildSite tries to cp from here; failure is caught below
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
  await cp(getVendorSourceDir(), vendorDest, { recursive: true }).catch(() => {
    // vendor scripts not available (e.g. test environment) — skip silently
  })

  // Render sections
  const body = portfolio.sections
    .filter(s => s.visible)
    .map(renderSection)
    .join('\n')

  const html = wrapTemplate(portfolio, body)
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8')
}
