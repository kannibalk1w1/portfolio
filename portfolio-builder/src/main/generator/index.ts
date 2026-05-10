import { cp, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, dirname, extname, join } from 'path'
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
import { renderLinks } from './sections/links'
import { renderSkills } from './sections/skills'
import { renderTimeline } from './sections/timeline'
import { renderQuote } from './sections/quote'
import { renderEmbed } from './sections/embed'
import { renderContent } from './sections/content'
import { renderStats } from './sections/stats'
import { renderButtons } from './sections/buttons'

function renderSection(section: Section): string {
  switch (section.type) {
    case 'about':   return renderAbout(section)
    case 'gallery': return renderGallery(section)
    case 'videos':  return renderVideos(section)
    case 'models':  return renderModels(section)
    case 'games':   return renderGames(section)
    case 'code':    return renderCode(section)
    case 'custom':   return renderCustom(section)
    case 'project':  return renderProject(section)
    case 'links':    return renderLinks(section)
    case 'skills':   return renderSkills(section)
    case 'timeline': return renderTimeline(section)
    case 'quote':    return renderQuote(section)
    case 'embed':    return renderEmbed(section)
    case 'content':  return renderContent(section)
    case 'stats':    return renderStats(section)
    case 'buttons':  return renderButtons(section)
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

const LAUNCHER_PS1 = `\
# Serves the portfolio from a local HTTP server so all features work correctly,
# including 3D models. Requires no installation — PowerShell is built into Windows.
$port = 8765
$root = $PSScriptRoot

$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.css'  = 'text/css'
    '.js'   = 'application/javascript';   '.mjs'  = 'application/javascript'
    '.json' = 'application/json';         '.wasm' = 'application/wasm'
    '.jpg'  = 'image/jpeg';               '.jpeg' = 'image/jpeg'
    '.png'  = 'image/png';                '.gif'  = 'image/gif'
    '.webp' = 'image/webp';               '.svg'  = 'image/svg+xml'
    '.mp4'  = 'video/mp4';                '.webm' = 'video/webm'
    '.glb'  = 'model/gltf-binary';        '.gltf' = 'model/gltf+json'
    '.bin'  = 'application/octet-stream'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Portfolio running at http://localhost:$port/ — press Ctrl+C to stop."
Start-Process "http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $path = $ctx.Request.Url.LocalPath.TrimStart('/')
        if ($path -eq '' -or $path -eq '/') { $path = 'index.html' }
        $file = Join-Path $root ($path.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if ([System.IO.File]::Exists($file)) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $ct  = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $ctx.Response.ContentType     = $ct
            $body = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentLength64 = $body.Length
            $ctx.Response.OutputStream.Write($body, 0, $body.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
        $ctx.Response.Close()
    } catch { break }
}
`

const LAUNCHER_BAT = `@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1"
`

// Read a companion file, trying the full relative path first then just the
// basename (our importer flattens everything into the assets folder).
async function readCompanion(dir: string, ref: string): Promise<Buffer | null> {
  const full = join(dir, ref)
  if (existsSync(full)) return readFile(full).catch(() => null)
  const flat = join(dir, basename(ref))
  return readFile(flat).catch(() => null)
}

// Embed a .gltf + its companions (.bin, textures) as a single self-contained
// data URI by replacing every external URI in the JSON with a base64 data URI.
async function embedGltfAsDataUri(gltfPath: string): Promise<string> {
  let raw: string
  try { raw = await readFile(gltfPath, 'utf-8') } catch { return '' }
  let gltf: Record<string, unknown[]>
  try { gltf = JSON.parse(raw) } catch { return '' }
  const dir = dirname(gltfPath)

  for (const buf of (gltf.buffers ?? []) as Array<{ uri?: string }>) {
    if (buf.uri && !buf.uri.startsWith('data:')) {
      const data = await readCompanion(dir, buf.uri)
      if (data) buf.uri = `data:application/octet-stream;base64,${data.toString('base64')}`
    }
  }
  for (const img of (gltf.images ?? []) as Array<{ uri?: string }>) {
    if (img.uri && !img.uri.startsWith('data:')) {
      const ext = extname(img.uri).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
      const data = await readCompanion(dir, img.uri)
      if (data) img.uri = `data:${mime};base64,${data.toString('base64')}`
    }
  }

  return `data:model/gltf+json;base64,${Buffer.from(JSON.stringify(gltf)).toString('base64')}`
}

// Replace every <model-viewer src="assets/..."> in the HTML with a data URI
// so the model loads from file:// without any network fetch.
async function embedModelsAsDataUri(html: string, assetsDir: string): Promise<string> {
  const filenames = new Set<string>()
  for (const m of html.matchAll(/<model-viewer src="assets\/([^"]+)"/g)) filenames.add(m[1])
  if (filenames.size === 0) return html

  const replacements = new Map<string, string>()
  for (const filename of filenames) {
    const filePath = join(assetsDir, filename)
    const ext = extname(filename).toLowerCase()
    try {
      if (ext === '.gltf') {
        replacements.set(filename, await embedGltfAsDataUri(filePath))
      } else {
        const buf = await readFile(filePath)
        const mime = ext === '.glb' ? 'model/gltf-binary' : 'application/octet-stream'
        replacements.set(filename, `data:${mime};base64,${buf.toString('base64')}`)
      }
    } catch { /* skip unreadable files */ }
  }

  return html.replace(/<model-viewer src="assets\/([^"]+)"/g, (match, filename) => {
    const dataUri = replacements.get(filename)
    return dataUri ? `<model-viewer src="${dataUri}"` : match
  })
}

export async function buildOfflineSite(
  portfolioDir: string,
  portfolio: Portfolio,
  destDir: string,
): Promise<void> {
  const destAssets = join(destDir, 'assets')
  await mkdir(destAssets, { recursive: true })

  await cp(join(portfolioDir, 'assets'), destAssets, { recursive: true }).catch(() => {})

  const vendorDest = join(destAssets, 'vendor')
  await mkdir(vendorDest, { recursive: true })
  const vendorSrc = getVendorSourceDir()
  let modelViewerContent: string | null = null
  if (vendorSrc) {
    await cp(vendorSrc, vendorDest, { recursive: true }).catch(err => {
      console.warn('Warning: failed to copy vendor scripts:', err.message)
    })
    const mvPath = join(vendorSrc, 'model-viewer.min.js')
    if (existsSync(mvPath)) {
      modelViewerContent = await readFile(mvPath, 'utf-8').catch(() => null)
    }
  }

  const body = portfolio.sections.filter(s => s.visible).map(renderSection).join('\n')
  let html = wrapTemplate(portfolio, body, { inlineModelViewer: modelViewerContent })
  html = await embedModelsAsDataUri(html, destAssets)
  await writeFile(join(destDir, 'index.html'), html, 'utf-8')
  await writeFile(join(destDir, 'launch.ps1'), LAUNCHER_PS1, 'utf-8')
  await writeFile(join(destDir, 'Launch Portfolio.bat'), LAUNCHER_BAT, 'utf-8')
}
