import { cp, mkdir, readFile, writeFile } from 'fs/promises'
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
  const html = wrapTemplate(portfolio, body, { inlineModelViewer: modelViewerContent })
  await writeFile(join(destDir, 'index.html'), html, 'utf-8')
  await writeFile(join(destDir, 'launch.ps1'), LAUNCHER_PS1, 'utf-8')
  await writeFile(join(destDir, 'Launch Portfolio.bat'), LAUNCHER_BAT, 'utf-8')
}
