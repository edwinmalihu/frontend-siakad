import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, KeyRound, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { extractError } from '../lib/api'
import { useLicense } from '../contexts/LicenseContext'

const LICENSE_API = '/api/v1/license'

export function LicensePage() {
  const { status, loading, refresh } = useLicense()
  const [activating, setActivating] = useState(false)
  const [startingTrial, setStartingTrial] = useState(false)
  const [licenseKey, setLicenseKey] = useState('')
  const [clientName, setClientName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setActivating(true)
    setMessage(null)
    try {
      const res = await fetch(`${LICENSE_API}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('siakad.admin.token')}`,
        },
        body: JSON.stringify({ license_key: licenseKey, client_name: clientName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Gagal mengaktifkan license')
      }
      setMessage({ type: 'success', text: 'License berhasil diaktifkan!' })
      setLicenseKey('')
      setClientName('')
      await refresh()
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) })
    } finally {
      setActivating(false)
    }
  }

  async function handleTrial() {
    setStartingTrial(true)
    setMessage(null)
    try {
      const res = await fetch(`${LICENSE_API}/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('siakad.admin.token')}`,
        },
        body: JSON.stringify({ client_name: clientName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Gagal memulai trial')
      }
      setMessage({ type: 'success', text: `Trial dimulai! Key: ${data.data.license_key}` })
      setClientName('')
      await refresh()
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) })
    } finally {
      setStartingTrial(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="loading-line" />
          <div className="loading-line" style={{ marginTop: '14px' }} />
        </div>
      </div>
    )
  }

  const TierIcon = status?.license?.tier === 'enterprise' ? Shield : Clock

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <p className="page-header__eyebrow">System</p>
          <h1 className="page-header__title">License</h1>
          <p className="page-header__description">
            Kelola license SIAKAD. Aktifkan key atau mulai trial.
          </p>
        </div>
      </div>

      {message && (
        <div className={`feedback ${message.type === 'error' ? 'feedback--error' : 'feedback--success'}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'error' ? <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> : <CheckCircle2 size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />}
          {message.text}
        </div>
      )}

      {/* Status Card */}
      {status?.has_license && status.license && (
        <div style={{
          background: 'var(--surface-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: status.is_expired ? '2px solid rgba(255, 107, 91, 0.3)' : status.is_expiring_soon ? '2px solid rgba(255, 182, 72, 0.3)' : '2px solid rgba(96, 193, 76, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TierIcon size={28} color={status.is_expired ? '#ff6b5b' : status.is_expiring_soon ? '#ffb648' : '#60c14c'} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {status.license.tier}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                {status.license.client_name || 'Unnamed'}
              </p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {status.is_expired ? (
                <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255, 107, 91, 0.12)', color: '#c74437', fontWeight: 700, fontSize: '0.8rem' }}>Expired</span>
              ) : status.is_expiring_soon ? (
                <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255, 182, 72, 0.12)', color: '#b87a00', fontWeight: 700, fontSize: '0.8rem' }}>{status.days_remaining} hari lagi</span>
              ) : (
                <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(96, 193, 76, 0.12)', color: '#3a8d2a', fontWeight: 700, fontSize: '0.8rem' }}>Active</span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-soft)' }}>Key:</span>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{status.license.license_key}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-soft)' }}>Expires:</span>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(status.license.expires_at).toLocaleDateString('id-ID')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Activate Form */}
      <div style={{
        background: 'var(--surface-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <KeyRound size={20} color="var(--teal)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Aktifkan Enterprise License</h3>
        </div>
        <form onSubmit={handleActivate}>
          <div className="field">
            <label htmlFor="license_key">License Key</label>
            <input
              id="license_key"
              type="text"
              placeholder="ENT-XXXXXXXXXXXXXXXX"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              required
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="field">
            <label htmlFor="client_name">Nama Client (opsional)</label>
            <input
              id="client_name"
              type="text"
              placeholder="e.g. SMA Negeri 1 Jakarta"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
          </div>
          <button className="button" disabled={activating} type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ShieldCheck size={18} />
            {activating ? 'Mengaktifkan...' : 'Aktifkan License'}
          </button>
        </form>
      </div>

      {/* Trial Section */}
      {!status?.has_license || (status?.license?.tier === 'trial' && status?.license?.trial_count < 2) ? (
        <div style={{
          background: 'var(--surface-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Clock size={20} color="var(--amber)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Mulai Trial</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginBottom: 16 }}>
            Trial berlaku selama 7 hari. Maksimal 2 kali penggunaan.
          </p>
          <div className="field">
            <label htmlFor="trial_client_name">Nama Client (opsional)</label>
            <input
              id="trial_client_name"
              type="text"
              placeholder="e.g. SMA Negeri 1 Jakarta"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
          </div>
          <button
            className="button-secondary"
            disabled={startingTrial}
            onClick={handleTrial}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <ShieldAlert size={18} />
            {startingTrial ? 'Memulai...' : 'Mulai Trial'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
