import type { Portfolio, CypMeta, SnapshotMeta, FtpConfig } from './portfolio'

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
      openFilePicker(opts: { properties: string[]; filters?: { name: string; extensions: string[] }[] }): Promise<string[]>
      openFolderPicker(): Promise<string | null>
      buildSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      previewSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      exportSite(portfolioDir: string, portfolio: Portfolio): Promise<void>
      publishFtp(portfolioDir: string, config: FtpConfig): Promise<void>
      getPortfoliosRoot(): Promise<string>
      setPortfoliosRoot(p: string): Promise<void>
    }
  }
}

export {}
