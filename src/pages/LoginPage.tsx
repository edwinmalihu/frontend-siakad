import { AlertCircle, ArrowRight, LockKeyhole, School2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { extractError } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, isAuthenticated } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setErrorMessage('')
      await login({ identifier, password })
      const nextPath = (location.state as { from?: string } | null)?.from || '/dashboard'
      navigate(nextPath, { replace: true })
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-badge">
            <School2 size={20} />
            {import.meta.env.VITE_APP_NAME || 'SIAKAD'}
          </div>
          <h1 className="auth-title">Masuk ke portal admin SIAKAD.</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <p className="page-header__eyebrow">Administrator Login</p>
            <h2 className="modal-title" style={{ marginTop: '8px' }}>
              Selamat datang kembali
            </h2>
          </div>

          {errorMessage ? (
            <div className="feedback feedback--error">
              <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {errorMessage}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="identifier">Username atau Email</label>
            <input
              autoComplete="username"
              id="identifier"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="admin"
              required
              type="text"
              value={identifier}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password"
              required
              type="password"
              value={password}
            />
          </div>

          <button className="button auth-submit" disabled={submitting || isLoading} type="submit">
            <LockKeyhole size={18} />
            {submitting ? 'Memeriksa akun…' : 'Masuk ke Dashboard'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
