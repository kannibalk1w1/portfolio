import { useState, useEffect } from 'react'
import { usePortfolio } from '../../store/PortfolioContext'
import type { FtpConfig } from '../../types/portfolio'

interface Props {
  onClose: () => void
}

type Status = { kind: 'success'; msg: string } | { kind: 'error'; msg: string } | null

const field: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid #ddd',
  borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  fontSize: 12, color: '#555', marginBottom: 3, display: 'block',
}

export function FtpModal({ onClose }: Props) {
  const { state, updatePortfolio, savePortfolio } = usePortfolio()
  const portfolio = state.portfolio!
  const slug = portfolio.slug
  const existing = portfolio.publish?.ftp

  const [host, setHost] = useState(existing?.host ?? '')
  const [port, setPort] = useState(String(existing?.port ?? 21))
  const [user, setUser] = useState(existing?.user ?? '')
  const [remotePath, setRemotePath] = useState(existing?.remotePath ?? '/')
  const [secure, setSecure] = useState(existing?.secure ?? false)
  const [password, setPassword] = useState('')
  const [hasStoredPw, setHasStoredPw] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api.hasFtpPassword(slug).then(setHasStoredPw)
  }, [slug])

  function buildConfig(): FtpConfig {
    return { host, port: Number(port) || 21, user, remotePath, secure }
  }

  async function persistSettings(): Promise<void> {
    const ftp = buildConfig()
    const updated = { ...portfolio, publish: { ...portfolio.publish, ftp } }
    updatePortfolio(updated)
    await savePortfolio(updated)
    if (password) {
      await window.api.setFtpPassword(slug, password)
      setHasStoredPw(true)
      setPassword('')
    }
  }

  async function handleSave() {
    setBusy(true)
    setStatus(null)
    try {
      await persistSettings()
      setStatus({ kind: 'success', msg: 'Settings saved.' })
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e.message ?? 'Save failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!host || !user) {
      setStatus({ kind: 'error', msg: 'Host and username are required.' })
      return
    }
    if (!hasStoredPw && !password) {
      setStatus({ kind: 'error', msg: 'Enter a password before publishing.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await persistSettings()
      await window.api.publishFtp(state.portfolioDir!, buildConfig())
      setStatus({ kind: 'success', msg: 'Published successfully.' })
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e.message ?? 'Publish failed.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>FTP Publish Settings</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }} aria-label="Close">×</button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 3 }}>
            <label style={label}>Host</label>
            <input style={field} value={host} onChange={e => setHost(e.target.value)} placeholder="ftp.example.com" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Port</label>
            <input style={field} value={port} onChange={e => setPort(e.target.value)} placeholder="21" type="number" min={1} max={65535} />
          </div>
        </div>

        <div>
          <label style={label}>Username</label>
          <input style={field} value={user} onChange={e => setUser(e.target.value)} placeholder="ftpuser" autoComplete="username" />
        </div>

        <div>
          <label style={label}>
            Password
            {hasStoredPw && !password && (
              <span style={{ marginLeft: 8, color: '#4caf50', fontSize: 11 }}>● saved</span>
            )}
          </label>
          <input
            style={field}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={hasStoredPw ? 'Leave blank to keep saved password' : 'Enter password'}
            type="password"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label style={label}>Remote path</label>
          <input style={field} value={remotePath} onChange={e => setRemotePath(e.target.value)} placeholder="/" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="ftp-secure" type="checkbox" checked={secure} onChange={e => setSecure(e.target.checked)} />
          <label htmlFor="ftp-secure" style={{ fontSize: 13, cursor: 'pointer' }}>Use FTPS (secure)</label>
        </div>

        {status && (
          <div style={{ fontSize: 13, color: status.kind === 'error' ? '#e94560' : '#4caf50', padding: '8px 10px', background: status.kind === 'error' ? '#fff5f6' : '#f5fdf5', borderRadius: 6 }}>
            {status.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ padding: '7px 16px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            style={{ padding: '7px 16px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
          >
            Save settings
          </button>
          <button
            onClick={handlePublish}
            disabled={busy}
            style={{ padding: '7px 16px', background: '#222', color: 'white', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
          >
            {busy ? 'Publishing…' : 'Publish now'}
          </button>
        </div>
      </div>
    </div>
  )
}
