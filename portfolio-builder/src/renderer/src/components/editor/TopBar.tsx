import { usePortfolio } from '../../store/PortfolioContext'

export function TopBar() {
  const { state, closePortfolio, savePortfolio } = usePortfolio()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid #e0e0e0',
      background: 'white',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={closePortfolio}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13 }}
        >
          ← Back
        </button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{state.portfolio?.name}</span>
        {state.dirty && (
          <span style={{ fontSize: 11, color: '#e94560' }}>Unsaved changes</span>
        )}
      </div>
      <button
        onClick={() => savePortfolio()}
        style={{ padding: '6px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
      >
        Save
      </button>
    </div>
  )
}
