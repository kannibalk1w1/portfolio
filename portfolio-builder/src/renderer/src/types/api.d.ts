import type { Portfolio, CypMeta, SnapshotMeta, FtpConfig } from './portfolio'
import type { OutputSummary } from './output'

// Local mirror of Electron's OpenDialogOptions — the renderer tsconfig does not
// include Electron types, so we cannot import from 'electron' directly here.
interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: { name: string; extensions: string[] }[]
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >
  message?: string
  securityScopedBookmarks?: boolean
}

declare global {
  interface Window {
    api: {
      listCyps(root: string): Promise<CypMeta[]>
      readPortfolio(root: string, slug: string): Promise<Portfolio>
      writePortfolio(root: string, p: Portfolio): Promise<void>
      deletePortfolio(root: string, slug: string): Promise<void>
      createSnapshot(dir: string): Promise<void>
      listSnapshots(dir: string): Promise<SnapshotMeta[]>
      restoreSnapshot(dir: string, id: string): Promise<void>
      importMedia(portfolioDir: string, filePaths: string[]): Promise<string[]>
      importGodotFolder(portfolioDir: string, folderPath: string, title: string): Promise<string>
      listAssets(portfolioDir: string): Promise<string[]>
      openFilePicker(opts: OpenDialogOptions): Promise<string[]>
      openFolderPicker(): Promise<string | null>
      buildSite(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary>
      previewSite(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary>
      previewMobile(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary>
      exportSite(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary>
      zipExport(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary | undefined>
      offlineExport(portfolioDir: string, portfolio: Portfolio): Promise<OutputSummary | undefined>
      publishFtp(portfolioDir: string, config: FtpConfig): Promise<void>
      setFtpPassword(slug: string, password: string): Promise<void>
      hasFtpPassword(slug: string): Promise<boolean>
      clearFtpPassword(slug: string): Promise<void>
      getPortfoliosRoot(): Promise<string>
      setPortfoliosRoot(p: string): Promise<void>
    }
  }
}

export {}
