/**
 * useImageInserter — returns a callback that opens the file picker, imports
 * the chosen image into the portfolio's assets folder, and returns an
 * asset:// URL ready to be inserted into a TipTap editor.
 *
 * Returns null if the user cancels or the import fails.
 * Only works when a portfolio is open (portfolioDir is set).
 */
import { usePortfolio } from '../store/PortfolioContext'
import { toFileUrl } from '../utils/fileUrl'

export function useImageInserter(): (() => Promise<string | null>) | undefined {
  const { state } = usePortfolio()
  const portfolioDir = state.portfolioDir

  if (!portfolioDir) return undefined

  return async () => {
    const paths = await window.api.openFilePicker({
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'] }],
    })
    if (!paths.length) return null
    const filenames = await window.api.importMedia(portfolioDir, paths)
    if (!filenames[0]) return null
    return toFileUrl(`${portfolioDir}/assets/${filenames[0]}`)
  }
}
