import { contextBridge, ipcRenderer } from 'electron'
import type { Portfolio, CypMeta, SnapshotMeta, FtpConfig } from '../renderer/src/types/portfolio'

contextBridge.exposeInMainWorld('api', {
  // Portfolio
  listCyps: (root: string): Promise<CypMeta[]> =>
    ipcRenderer.invoke('portfolio:list', root),
  readPortfolio: (root: string, slug: string): Promise<Portfolio> =>
    ipcRenderer.invoke('portfolio:read', root, slug),
  writePortfolio: (root: string, p: Portfolio): Promise<void> =>
    ipcRenderer.invoke('portfolio:write', root, p),
  deletePortfolio: (root: string, slug: string): Promise<void> =>
    ipcRenderer.invoke('portfolio:delete', root, slug),

  // Snapshots
  createSnapshot: (dir: string): Promise<void> =>
    ipcRenderer.invoke('snapshot:create', dir),
  listSnapshots: (dir: string): Promise<SnapshotMeta[]> =>
    ipcRenderer.invoke('snapshot:list', dir),
  restoreSnapshot: (dir: string, id: string): Promise<void> =>
    ipcRenderer.invoke('snapshot:restore', dir, id),

  // Media
  importMedia: (portfolioDir: string, filePaths: string[]): Promise<string[]> =>
    ipcRenderer.invoke('media:import', portfolioDir, filePaths),
  importGodotFolder: (portfolioDir: string, folderPath: string, title: string): Promise<string> =>
    ipcRenderer.invoke('media:importGodot', portfolioDir, folderPath, title),

  // Dialogs
  openFilePicker: (opts: Electron.OpenDialogOptions): Promise<string[]> =>
    ipcRenderer.invoke('dialog:openFile', opts),
  openFolderPicker: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),

  // Site generation
  buildSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:build', portfolioDir, portfolio),
  previewSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:preview', portfolioDir, portfolio),
  previewMobile: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:preview-mobile', portfolioDir, portfolio),
  exportSite: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:export', portfolioDir, portfolio),
  zipExport: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:zip', portfolioDir, portfolio),
  offlineExport: (portfolioDir: string, portfolio: Portfolio): Promise<void> =>
    ipcRenderer.invoke('site:offline', portfolioDir, portfolio),

  // Publish
  publishFtp: (portfolioDir: string, config: FtpConfig): Promise<void> =>
    ipcRenderer.invoke('publish:ftp', portfolioDir, config),

  // FTP credential storage (encrypted via Electron safeStorage; never written
  // to portfolio.json)
  setFtpPassword: (slug: string, password: string): Promise<void> =>
    ipcRenderer.invoke('credentials:setFtpPassword', slug, password),
  hasFtpPassword: (slug: string): Promise<boolean> =>
    ipcRenderer.invoke('credentials:hasFtpPassword', slug),
  clearFtpPassword: (slug: string): Promise<void> =>
    ipcRenderer.invoke('credentials:clearFtpPassword', slug),

  // Config
  getPortfoliosRoot: (): Promise<string> =>
    ipcRenderer.invoke('config:getRoot'),
  setPortfoliosRoot: (p: string): Promise<void> =>
    ipcRenderer.invoke('config:setRoot', p),
})
