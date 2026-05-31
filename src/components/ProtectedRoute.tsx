import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useLicense } from '../contexts/LicenseContext'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'

type ProtectedRouteProps = {
  allowedRoleCodes?: string[]
}

export function ProtectedRoute({ allowedRoleCodes }: ProtectedRouteProps) {
  const { hasRoleAccess, isAuthenticated, isLoading } = useAuth()
  const { status, loading: licenseLoading } = useLicense()
  const location = useLocation()

  if (isLoading || licenseLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="loading-line" />
          <div className="loading-line" style={{ marginTop: '14px' }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  // If on /license page, always allow
  if (location.pathname === '/license') {
    if (!hasRoleAccess(allowedRoleCodes)) {
      return <AccessDeniedPage />
    }
    return <Outlet />
  }

  // No license or expired — redirect to /license
  if (!status?.has_license || status.is_expired) {
    return <Navigate replace to="/license" />
  }

  if (!hasRoleAccess(allowedRoleCodes)) {
    return <AccessDeniedPage />
  }

  return <Outlet />
}
