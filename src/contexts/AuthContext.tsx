import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import axios from 'axios'
import { clearAuthSession, getStoredToken, getStoredUser, saveAuthSession } from '../lib/auth-storage'
import type { AuthUser, LoginPayload, LoginResult } from '../types/auth'
import { AuthContext, type AuthContextValue } from './auth-context'

const authHttp = axios.create({
  baseURL: '/api/v1/auth',
  timeout: 15000,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(true)
  const deferredToken = useDeferredValue(token)

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      if (!deferredToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authHttp.get<{ data: AuthUser; success: boolean }>('/me', {
          headers: {
            Authorization: `Bearer ${deferredToken}`,
          },
        })

        if (!isMounted) {
          return
        }

        setUser(response.data.data)
        saveAuthSession(deferredToken, response.data.data)
      } catch {
        if (!isMounted) {
          return
        }

        clearAuthSession()
        setToken('')
        setUser(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [deferredToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token && user),
      isLoading,
      token,
      user,
      async login(payload: LoginPayload) {
        const response = await authHttp.post<{ data: LoginResult; success: boolean }>('/login', payload)
        const loginData = response.data.data

        startTransition(() => {
          setToken(loginData.access_token)
          setUser(loginData.user)
          saveAuthSession(loginData.access_token, loginData.user)
        })
      },
      logout() {
        clearAuthSession()
        startTransition(() => {
          setToken('')
          setUser(null)
        })
      },
    }),
    [isLoading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
