import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useLicense } from '../contexts/LicenseContext'

export function LicenseAlert() {
  const { status } = useLicense()
  const [dismissed, setDismissed] = useState(false)

  if (!status || dismissed) return null

  // Expired
  if (status.is_expired) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', background: 'rgba(255, 107, 91, 0.1)',
        borderBottom: '2px solid rgba(255, 107, 91, 0.3)',
        color: '#c74437', fontWeight: 600, fontSize: '0.9rem',
      }}>
        <ShieldAlert size={20} />
        <span>License sudah expired. Silakan aktifkan license baru di halaman <a href="/license" style={{ fontWeight: 700, textDecoration: 'underline' }}>/license</a>.</span>
        <button onClick={() => setDismissed(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  // Expiring soon (H-30)
  if (status.is_expiring_soon) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', background: 'rgba(255, 182, 72, 0.1)',
        borderBottom: '2px solid rgba(255, 182, 72, 0.3)',
        color: '#b87a00', fontWeight: 600, fontSize: '0.9rem',
      }}>
        <AlertTriangle size={20} />
        <span>License akan expire dalam <strong>{status.days_remaining} hari</strong>. Perpanjang di halaman <a href="/license" style={{ fontWeight: 700, textDecoration: 'underline' }}>/license</a>.</span>
        <button onClick={() => setDismissed(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  return null
}
