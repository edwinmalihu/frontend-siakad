import type { AuthUser } from '../types/auth'
import type { NavigationItem, NavigationSection } from '../types/resources'

const ADMIN_ROLE_CODES = new Set(['admin', 'super_admin', 'super-admin'])

function normalizeRoleCode(code: string) {
  return code.trim().toLowerCase().replace(/-/g, '_')
}

export function hasRoleAccess(user: AuthUser | null, allowedRoleCodes?: string[]) {
  if (!allowedRoleCodes || allowedRoleCodes.length === 0) {
    return true
  }
  const roleCodes = new Set((user?.role_codes ?? []).map(normalizeRoleCode))
  if (Array.from(roleCodes).some((code) => ADMIN_ROLE_CODES.has(code))) {
    return true
  }
  return allowedRoleCodes.map(normalizeRoleCode).some((code) => roleCodes.has(code))
}

export function filterNavigationByRole(sections: NavigationSection[], user: AuthUser | null): NavigationSection[] {
  return sections
    .map((section) => {
      const items = section.items
        .map((item) => filterNavigationItem(item, user))
        .filter((item): item is NavigationItem => item !== null)
      return { ...section, items }
    })
    .filter((section) => section.items.length > 0)
}

function filterNavigationItem(item: NavigationItem, user: AuthUser | null): NavigationItem | null {
  const filteredChildren = item.children
    ?.map((child) => filterNavigationItem(child, user))
    .filter((child): child is NavigationItem => child !== null)

  const ownAccess = hasRoleAccess(user, item.allowedRoleCodes)

  if (filteredChildren && filteredChildren.length > 0) {
    if (!ownAccess && filteredChildren.length === 0) {
      return null
    }
    return {
      ...item,
      children: filteredChildren,
    }
  }

  if (!ownAccess) {
    return null
  }

  return item
}

export function formatRoleLabel(user: AuthUser | null) {
  if (!user?.role_codes?.length) {
    return 'Portal akademik terpadu'
  }

  return user.role_codes
    .map((code) =>
      code
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(', ')
}
