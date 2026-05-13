import { useEffect, useMemo, useRef } from 'react'
import type { Portfolio } from '../../types/portfolio'
import { checkPortfolioReadiness, type ReadinessItem } from '../../lib/readiness/checkPortfolioReadiness'

interface Props {
  portfolio: Portfolio
  onClose: () => void
  onSelectSection?: (sectionId: string) => void
}

export function ReadinessModal({ portfolio, onClose, onSelectSection }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const result = useMemo(() => checkPortfolioReadiness(portfolio), [portfolio])
  const blocking = result.items.filter(item => item.severity === 'error')
  const warnings = result.items.filter(item => item.severity === 'warning')

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    panelRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      data-testid="readiness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={true}
        aria-labelledby="readiness-modal-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560,
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', margin: '0 16px', outline: 'none',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
        }}>
          <div>
            <div id="readiness-modal-title" style={{ fontWeight: 700, fontSize: 15 }}>
              Portfolio Readiness
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {result.ready ? 'Ready to publish' : 'Needs attention before publishing'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >x</button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span style={{
              borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 700,
              color: blocking.length ? '#991b1b' : '#166534',
              background: blocking.length ? '#fee2e2' : '#dcfce7',
            }}>
              {formatCount(blocking.length, 'blocking')}
            </span>
            <span style={{
              borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 700,
              color: warnings.length ? '#92400e' : '#166534',
              background: warnings.length ? '#fef3c7' : '#dcfce7',
            }}>
              {formatCount(warnings.length, 'warning', 'warnings')}
            </span>
          </div>

          {result.items.length === 0 ? (
            <div style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>
              No issues found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {blocking.length > 0 && (
                <ReadinessGroup title="Blocking issues" colour="#991b1b" items={blocking} onSelectSection={onSelectSection} onClose={onClose} />
              )}
              {warnings.length > 0 && (
                <ReadinessGroup title="Warnings" colour="#92400e" items={warnings} onSelectSection={onSelectSection} onClose={onClose} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatCount(count: number, singular: string, plural = singular): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function ReadinessGroup({
  title,
  colour,
  items,
  onSelectSection,
  onClose,
}: {
  title: string
  colour: string
  items: ReadinessItem[]
  onSelectSection?: (sectionId: string) => void
  onClose: () => void
}) {
  function handleSelect(sectionId: string) {
    onSelectSection?.(sectionId)
    onClose()
  }

  return (
    <section>
      <h3 style={{ margin: '0 0 6px', fontSize: 13, color: colour }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(item => (
          <li key={item.id} style={{ fontSize: 13, color: '#333' }}>
            {item.sectionId && onSelectSection ? (
              <button
                onClick={() => handleSelect(item.sectionId!)}
                style={{
                  border: 'none', background: 'none', padding: 0, margin: 0,
                  color: '#2563eb', cursor: 'pointer', font: 'inherit', textAlign: 'left',
                }}
              >
                {item.message}
              </button>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
