import { app, dialog, ipcMain, shell, BrowserWindow } from 'electron'
import { extname, join, join as pathJoin } from 'path'
import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { basename } from 'path'
import {
  listCyps,
  readPortfolio,
  writePortfolio,
  deletePortfolio,
  stripLegacyFtpPassword,
} from './portfolio/store'
import { createSnapshot, listSnapshots, restoreSnapshot } from './portfolio/snapshot'
import { importMediaFiles, importGodotFolder } from './media/importer'
import { buildSite, buildOfflineSite } from './generator/index'
import archiver from 'archiver'
import { createWriteStream } from 'fs'
import { uploadFtp } from './publish/ftp'
import { resolveSafePath } from './preview/safePath'
import {
  setFtpPassword,
  getFtpPassword,
  hasFtpPassword,
  deleteFtpPassword,
} from './publish/credentials'
import type { Portfolio, FtpConfig } from '../renderer/src/types/portfolio'

const configPath = join(app.getPath('userData'), 'config.json')

async function getRoot(): Promise<string> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed.portfoliosRoot === 'string') return parsed.portfoliosRoot
  } catch {
    // config doesn't exist yet
  }
  const def = join(app.getPath('documents'), 'CYP Portfolios')
  await mkdir(def, { recursive: true })
  return def
}

async function listAssetFiles(portfolioDir: string): Promise<string[]> {
  const assetsDir = join(portfolioDir, 'assets')
  const files: string[] = []

  async function walk(dir: string, prefix = ''): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' })
    } catch {
      return
    }
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full, relative)
      } else if (entry.isFile()) {
        files.push(relative)
      }
    }
  }

  await walk(assetsDir)
  return files
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:getRoot', getRoot)

  ipcMain.handle('config:setRoot', async (_event, p: string) => {
    let existing: Record<string, unknown> = {}
    try {
      existing = JSON.parse(await readFile(configPath, 'utf-8'))
    } catch { /* first write or corrupt config */ }
    await writeFile(configPath, JSON.stringify({ ...existing, portfoliosRoot: p }), 'utf-8')
  })

  ipcMain.handle('portfolio:list', (_event, root: string) => listCyps(root))
  ipcMain.handle('portfolio:read', async (_event, root: string, slug: string) => {
    const p = await readPortfolio(root, slug)
    // One-time migration: if the JSON contains a plaintext FTP password, move
    // it into encrypted secure storage and persist the cleaned JSON back.
    const { portfolio, password } = stripLegacyFtpPassword(p)
    if (password !== null) {
      await setFtpPassword(slug, password)
      await writePortfolio(root, portfolio)
    }
    return portfolio
  })
  ipcMain.handle('portfolio:write', (_event, root: string, p: Portfolio) => {
    // Defence in depth: never let a password slip into portfolio.json from any
    // caller. If one is present, store it securely and strip before writing.
    const { portfolio, password } = stripLegacyFtpPassword(p)
    const tasks: Promise<unknown>[] = [writePortfolio(root, portfolio)]
    if (password !== null) tasks.push(setFtpPassword(portfolio.slug, password))
    return Promise.all(tasks).then(() => undefined)
  })
  ipcMain.handle('portfolio:delete', async (_event, root: string, slug: string) => {
    await deletePortfolio(root, slug)
    await deleteFtpPassword(slug)
  })

  ipcMain.handle('snapshot:create', (_event, dir: string) => createSnapshot(dir))
  ipcMain.handle('snapshot:list', (_event, dir: string) => listSnapshots(dir))
  ipcMain.handle('snapshot:restore', (_event, dir: string, id: string) => restoreSnapshot(dir, id))

  ipcMain.handle('media:import', (_event, portfolioDir: string, filePaths: string[]) =>
    importMediaFiles(portfolioDir, filePaths))
  ipcMain.handle('media:importGodot', (_event, portfolioDir: string, folderPath: string, title: string) =>
    importGodotFolder(portfolioDir, folderPath, title))
  ipcMain.handle('media:listAssets', (_event, portfolioDir: string) =>
    listAssetFiles(portfolioDir))

  ipcMain.handle('dialog:openFile', (_event, opts: Electron.OpenDialogOptions) =>
    dialog.showOpenDialog(opts).then(r => r.filePaths))
  ipcMain.handle('dialog:openFolder', () =>
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then(r => r.filePaths[0] ?? null))

  const MIME: Record<string, string> = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.mjs': 'application/javascript', '.json': 'application/json',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.tif': 'image/tiff', '.tiff': 'image/tiff',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.mov': 'video/quicktime', '.m4v': 'video/mp4',
    '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
    '.wasm': 'application/wasm',
  }

  ipcMain.handle('site:build', (_event, dir: string, p: Portfolio) => buildSite(dir, p))
  ipcMain.handle('site:preview', async (_event, dir: string, p: Portfolio) => {
    const summary = await buildSite(dir, p)
    const outputDir = pathJoin(dir, 'output')

    const server = createServer((req, res) => {
      const filePath = resolveSafePath(outputDir, req.url)
      if (filePath === null) {
        res.writeHead(403); res.end('Forbidden'); return
      }
      if (!existsSync(filePath)) {
        res.writeHead(404); res.end('Not found'); return
      }
      const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime })
      createReadStream(filePath).pipe(res)
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      shell.openExternal(`http://127.0.0.1:${port}`)
      // Auto-close server after 60 minutes
      setTimeout(() => server.close(), 60 * 60 * 1000)
    })
    return summary
  })
  ipcMain.handle('site:preview-mobile', async (_event, dir: string, p: Portfolio) => {
    const summary = await buildSite(dir, p)
    const outputDir = pathJoin(dir, 'output')

    const server = createServer((req, res) => {
      const safePath = (req.url ?? '/').split('?')[0]
      const filePath = pathJoin(outputDir, safePath === '/' ? 'index.html' : safePath)
      if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return }
      const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime })
      createReadStream(filePath).pipe(res)
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      const win = new BrowserWindow({
        width: 390, height: 844,
        resizable: true,
        title: 'Mobile Preview — 390px',
        autoHideMenuBar: true,
      })
      win.loadURL(`http://127.0.0.1:${port}`)
      win.on('closed', () => server.close())
    })
    return summary
  })

  ipcMain.handle('site:export', async (_event, dir: string, p: Portfolio) => {
    const summary = await buildSite(dir, p)
    await shell.openPath(join(dir, 'output'))
    return summary
  })

  ipcMain.handle('site:zip', async (_event, dir: string, p: Portfolio) => {
    const summary = await buildSite(dir, p)
    const outputDir = join(dir, 'output')

    const result = await dialog.showSaveDialog({
      title: 'Save portfolio as ZIP',
      defaultPath: `${p.name} Portfolio.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })
    if (!result.filePath) return

    await new Promise<void>((resolve, reject) => {
      const output  = createWriteStream(result.filePath!)
      const archive = archiver('zip', { zlib: { level: 6 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      archive.directory(outputDir, false)
      archive.finalize()
    })

    shell.showItemInFolder(result.filePath)
    return summary
  })

  ipcMain.handle('site:offline', async (_event, dir: string, p: Portfolio) => {
    const result = await dialog.showOpenDialog({
      title: 'Choose folder for offline export',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return
    const dest = result.filePaths[0]
    const summary = await buildOfflineSite(dir, p, dest)
    await shell.openPath(dest)
    return summary
  })

  ipcMain.handle('publish:ftp', async (_event, dir: string, config: FtpConfig) => {
    const slug = basename(dir)
    const password = await getFtpPassword(slug)
    if (!password) {
      throw new Error(
        'No FTP password is stored for this portfolio. Set one before publishing.',
      )
    }
    // Strip any password the renderer may have sent and use the secure one.
    const { password: _drop, ...rest } = config
    void _drop
    await uploadFtp(dir, { ...rest, password })
  })

  // Per-portfolio FTP credential management
  ipcMain.handle('credentials:setFtpPassword', (_event, slug: string, password: string) =>
    setFtpPassword(slug, password))
  ipcMain.handle('credentials:hasFtpPassword', (_event, slug: string) => hasFtpPassword(slug))
  ipcMain.handle('credentials:clearFtpPassword', (_event, slug: string) =>
    deleteFtpPassword(slug))
}
