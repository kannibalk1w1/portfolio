import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { Portfolio } from '../types/portfolio'

interface AppState {
  portfoliosRoot: string
  openPortfolioSlug: string | null
  portfolio: Portfolio | null
  portfolioDir: string | null
  dirty: boolean
}

type Action =
  | { type: 'SET_ROOT'; root: string }
  | { type: 'OPEN_PORTFOLIO'; portfolio: Portfolio; slug: string; root: string }
  | { type: 'CLOSE_PORTFOLIO' }
  | { type: 'UPDATE_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'MARK_CLEAN' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROOT':
      return { ...state, portfoliosRoot: action.root }
    case 'OPEN_PORTFOLIO':
      return {
        ...state,
        openPortfolioSlug: action.slug,
        portfolio: action.portfolio,
        portfolioDir: `${action.root}/${action.slug}`,
        dirty: false
      }
    case 'CLOSE_PORTFOLIO':
      return { ...state, openPortfolioSlug: null, portfolio: null, portfolioDir: null, dirty: false }
    case 'UPDATE_PORTFOLIO':
      return { ...state, portfolio: action.portfolio, dirty: true }
    case 'MARK_CLEAN':
      return { ...state, dirty: false }
    default:
      return state
  }
}

interface PortfolioContextValue {
  state: AppState
  openPortfolio: (slug: string) => Promise<void>
  closePortfolio: () => void
  savePortfolio: (p?: Portfolio) => Promise<void>
  updatePortfolio: (p: Portfolio) => void
  setRoot: (root: string) => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    portfoliosRoot: '',
    openPortfolioSlug: null,
    portfolio: null,
    portfolioDir: null,
    dirty: false
  })

  const setRoot = useCallback(async (root: string) => {
    await window.api.setPortfoliosRoot(root)
    dispatch({ type: 'SET_ROOT', root })
  }, [])

  const openPortfolio = useCallback(async (slug: string) => {
    const root = state.portfoliosRoot
    const portfolio = await window.api.readPortfolio(root, slug)
    dispatch({ type: 'OPEN_PORTFOLIO', portfolio, slug, root })
  }, [state.portfoliosRoot])

  const closePortfolio = useCallback(() => {
    dispatch({ type: 'CLOSE_PORTFOLIO' })
  }, [])

  const savePortfolio = useCallback(async (p?: Portfolio) => {
    const portfolio = p ?? state.portfolio
    if (!portfolio || !state.portfolioDir || !state.openPortfolioSlug) return
    await window.api.createSnapshot(state.portfolioDir)
    await window.api.writePortfolio(state.portfoliosRoot, portfolio)
    dispatch({ type: 'MARK_CLEAN' })
  }, [state.portfolio, state.portfolioDir, state.portfoliosRoot, state.openPortfolioSlug])

  const updatePortfolio = useCallback((p: Portfolio) => {
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: p })
  }, [])

  return (
    <PortfolioContext.Provider value={{ state, openPortfolio, closePortfolio, savePortfolio, updatePortfolio, setRoot }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider')
  return ctx
}
