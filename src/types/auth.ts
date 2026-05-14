export type AuthRole = {
  code: string
  id: number
  name: string
}

export type AuthUser = {
  email?: string
  full_name?: string
  id: number
  is_active: boolean
  phone?: string
  photo_url?: string
  role_codes: string[]
  roles: AuthRole[]
  username: string
}

export type LoginPayload = {
  identifier: string
  password: string
}

export type LoginResult = {
  access_token: string
  expires_at: string
  token_type: string
  user: AuthUser
}
