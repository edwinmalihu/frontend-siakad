import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'

const LICENSE_API = '/api/v1/license'

interface LicenseInfo {
  id: number
  license_key: string
  tier: string
  starts_at: string
  expires_at: string
  trial_count: number
  client_name: string
}

interface LicenseStatus {
  has_license: boolean
  is_active: boolean
  is_expired: boolean
  is_expiring_soon: boolean
  days_remaining: number
  license: LicenseInfo | null
}

interface LicenseContextValue {
  status: LicenseStatus | null
  loading: boolean
  refresh: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextValue | null>(null)

export function LicenseProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!token) {
      setStatus(null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${LICENSE_API}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStatus(data.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <LicenseContext.Provider value={{ status, loading, refresh: fetchStatus }}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense() {
  const ctx = useContext(LicenseContext)
  if (!ctx) throw new Error('useLicense must be used within LicenseProvider')
  return ctx
}
