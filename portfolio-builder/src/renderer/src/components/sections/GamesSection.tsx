import { usePortfolio } from '../../store/PortfolioContext'
import type { GamesSection as GamesSectionType, GameItem, Section } from '../../types/portfolio'

export function GamesSection({ section }: { section: GamesSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  function updateSection(patch: Partial<GamesSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  async function handleImportGodot() {
    const folder = await window.api.openFolderPicker()
    if (!folder) return
    const title = prompt('Game title?') ?? 'Game'
    const folderName = await window.api.importGodotFolder(state.portfolioDir!, folder, title)
    const newItem: GameItem = {
      id: `game-${Date.now()}`,
      folderName,
      title,
      entryFile: 'index.html',
    }
    updateSection({ items: [...section.items, newItem] })
  }

  function removeItem(id: string) {
    updateSection({ items: section.items.filter(i => i.id !== id) })
  }

  function updateEntryFile(id: string, entryFile: string) {
    updateSection({ items: section.items.map(i => i.id === id ? { ...i, entryFile } : i) })
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {section.items.map(item => (
          <div key={item.id} style={{ padding: '12px 16px', background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>🎮</span>
              <span style={{ fontWeight: 500, flex: 1 }}>{item.title}</span>
              <button
                onClick={() => removeItem(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18 }}
                aria-label={`Remove ${item.title}`}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
              Folder: assets/{item.folderName}/
            </div>
            <label style={{ fontSize: 12, color: '#666' }}>
              Entry file:&nbsp;
              <input
                value={item.entryFile}
                onChange={e => updateEntryFile(item.id, e.target.value)}
                style={{ padding: '3px 6px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 12, width: 160 }}
              />
            </label>
          </div>
        ))}
      </div>
      <button
        onClick={handleImportGodot}
        style={{ padding: '10px 20px', border: '1px dashed #ddd', borderRadius: 8, cursor: 'pointer', background: 'none', color: '#888', fontSize: 13 }}
      >
        + Import Godot HTML5 export folder
      </button>
    </div>
  )
}
