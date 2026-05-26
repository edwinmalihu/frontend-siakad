import { createContext } from 'react'
import type { AuthUser, LoginPayload } from '../types/auth'

export type AuthContextValue = {
  hasRoleAccess: (allowedRoleCodes?: string[]) => boolean
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  token: string
  user: AuthUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
