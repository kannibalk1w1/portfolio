/**
 * Toaster — lightweight toast notification system.
 *
 * useToaster() returns a { toasts, notify } pair. Call notify(message, kind)
 * from anywhere that receives the function as a prop. Toasts auto-dismiss
 * after 4 seconds and stack bottom-right.
 *
 * kinds: 'success' | 'error' | 'info'
 */
import { useState, useCallback } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

export type NotifyFn = (message: string, kind?: ToastKind) => void

const COLOURS: Record<ToastKind, { bg: string; border: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e' },
  error:   { bg: '#fff5f5', border: '#e94560' },
  info:    { bg: '#f0f9ff', border: '#0ea5e9' },
}

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const DISMISS_MS = 4500

export function useToaster(): { toasts: Toast[]; notify: NotifyFn } {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback<NotifyFn>((message, kind = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), DISMISS_MS)
  }, [])

  return { toasts, notify }
}

export function Toaster({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      zIndex: 9999, maxWidth: 380, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const { bg, border } = COLOURS[t.kind]
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '11px 16px',
            background: bg,
            border: `1px solid ${border}`,
            borderLeft: `4px solid ${border}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            fontSize: 13, color: '#1e293b', lineHeight: 1.45,
            pointerEvents: 'auto',
          }}>
            <span style={{ color: border, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
              {ICONS[t.kind]}
            </span>
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
