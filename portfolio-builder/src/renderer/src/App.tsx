import { PortfolioProvider, usePortfolio } from './store/PortfolioContext'
import { Picker } from './pages/Picker'
import { Editor } from './pages/Editor'

function Inner() {
  const { state } = usePortfolio()
  return state.openPortfolioSlug ? <Editor /> : <Picker />
}

export default function App() {
  return (
    <PortfolioProvider>
      <Inner />
    </PortfolioProvider>
  )
}
