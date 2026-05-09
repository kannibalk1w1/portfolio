import { app, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { listCyps, readPortfolio, writePortfolio, deletePortfolio } from './portfolio/store'
import { createSnapshot, listSnapshots, restoreSnapshot } from './portfolio/snapshot'
import { importMediaFiles, importGodotFolder } from './media/importer'
import { buildSite } from './generator/index'
import { uploadFtp } from './publish/ftp'
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

export function registerIpcHandlers(): void {
  ipcMain.handle('config:getRoot', getRoot)

  ipcMain.handle('config:setRoot', async (_event, p: string) => {
    await writeFile(configPath, JSON.stringify({ portfoliosRoot: p }), 'utf-8')
  })

  ipcMain.handle('portfolio:list', (_event, root: string) => listCyps(root))
  ipcMain.handle('portfolio:read', (_event, root: string, slug: string) => readPortfolio(root, slug))
  ipcMain.handle('portfolio:write', (_event, root: string, p: Portfolio) => writePortfolio(root, p))
  ipcMain.handle('portfolio:delete', (_event, root: string, slug: string) => deletePortfolio(root, slug))

  ipcMain.handle('snapshot:create', (_event, dir: string) => createSnapshot(dir))
  ipcMain.handle('snapshot:list', (_event, dir: string) => listSnapshots(dir))
  ipcMain.handle('snapshot:restore', (_event, dir: string, id: string) => restoreSnapshot(dir, id))

  ipcMain.handle('media:import', (_event, portfolioDir: string, filePaths: string[]) =>
    importMediaFiles(portfolioDir, filePaths))
  ipcMain.handle('media:importGodot', (_event, portfolioDir: string, folderPath: string, title: string) =>
    importGodotFolder(portfolioDir, folderPath, title))

  ipcMain.handle('dialog:openFile', (_event, opts: Electron.OpenDialogOptions) =>
    dialog.showOpenDialog(opts).then(r => r.filePaths))
  ipcMain.handle('dialog:openFolder', () =>
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then(r => r.filePaths[0] ?? null))

  ipcMain.handle('site:build', (_event, dir: string, p: Portfolio) => buildSite(dir, p))
  ipcMain.handle('site:preview', async (_event, dir: string, p: Portfolio) => {
    await buildSite(dir, p)
    await shell.openPath(join(dir, 'output', 'index.html'))
  })
  ipcMain.handle('site:export', async (_event, dir: string, p: Portfolio) => {
    await buildSite(dir, p)
    await shell.openPath(join(dir, 'output'))
  })

  ipcMain.handle('publish:ftp', (_event, dir: string, config: FtpConfig) => uploadFtp(dir, config))
}
