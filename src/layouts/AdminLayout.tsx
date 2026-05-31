import { ChevronDown, LayoutGrid, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigationSections } from '../config/navigation'
import { filterNavigationByRole, formatRoleLabel } from '../lib/access-control'
import type { NavigationItem } from '../types/resources'
import { useAuth } from '../contexts/useAuth'
import { LicenseAlert } from '../components/LicenseAlert'

function matchesPath(pathname: string, item: NavigationItem): boolean {
  if (item.path === pathname) {
    return true
  }

  return item.children?.some((child) => matchesPath(pathname, child)) ?? false
}

function findCurrentLabel(pathname: string, sections: typeof navigationSections): string {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.path === pathname) {
        return `${section.label} / ${item.label}`
      }

      if (item.children) {
        const child = item.children.find((entry) => entry.path === pathname)
        if (child) {
          return `${item.label} / ${child.label}`
        }
      }
    }
  }

  return 'Portal Admin'
}

export function AdminLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const { logout, user } = useAuth()
  const visibleSections = useMemo(() => filterNavigationByRole(navigationSections, user), [user])

  const currentLabel = useMemo(() => {
    return findCurrentLabel(location.pathname, visibleSections)
  }, [location.pathname, visibleSections])

  function isGroupExpanded(item: NavigationItem) {
    if (!item.children?.length) {
      return false
    }
    return matchesPath(location.pathname, item) || expandedGroups[item.path] === true
  }

  function toggleGroup(item: NavigationItem) {
    setExpandedGroups((current) => ({
      ...current,
      [item.path]: !(current[item.path] ?? matchesPath(location.pathname, item)),
    }))
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand__logo">
            <ShieldCheck size={24} />
          </div>
          <div className="sidebar-brand__text">
            <strong>{import.meta.env.VITE_APP_NAME || 'SIAKAD'}</strong>
            <span>Admin Control Center</span>
          </div>
        </div>

        <div className="sidebar-scroll">
          {visibleSections.map((section) => (
            <section className="sidebar-section" key={section.label}>
              <div className="sidebar-section__label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon
                const parentActive = matchesPath(location.pathname, item)

                if (item.children?.length) {
                  const expanded = isGroupExpanded(item)
                  return (
                    <div
                      className={`sidebar-group ${parentActive ? 'sidebar-group--active' : ''} ${expanded ? 'sidebar-group--expanded' : ''}`}
                      key={item.path}
                    >
                      <div className={`sidebar-parent-row ${parentActive ? 'sidebar-parent-row--active' : ''}`}>
                        <NavLink
                          className={({ isActive }) =>
                            `sidebar-link sidebar-link--parent sidebar-link--parent-main ${isActive || parentActive ? 'sidebar-link--active' : ''}`
                          }
                          onClick={() => setSidebarOpen(false)}
                          to={item.path}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </NavLink>
                        <button
                          aria-expanded={expanded}
                          aria-label={`Toggle ${item.label}`}
                          className={`sidebar-toggle ${expanded ? 'sidebar-toggle--expanded' : ''}`}
                          onClick={() => toggleGroup(item)}
                          type="button"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      <div className={`sidebar-submenu-shell ${expanded ? 'sidebar-submenu-shell--open' : ''}`}>
                        <div className="sidebar-submenu">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            return (
                              <NavLink
                                className={({ isActive }) =>
                                  `sidebar-link sidebar-link--child ${isActive ? 'sidebar-link--active' : ''}`
                                }
                                key={child.path}
                                onClick={() => setSidebarOpen(false)}
                                to={child.path}
                              >
                                <ChildIcon size={16} />
                                <span>{child.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <NavLink
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                    }
                    key={item.path}
                    onClick={() => setSidebarOpen(false)}
                    to={item.path}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </section>
          ))}
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              aria-label="Toggle navigation"
              className="topbar__menu"
              onClick={() => setSidebarOpen((value) => !value)}
              type="button"
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="topbar__crumbs">{currentLabel}</div>
              <div className="topbar__title">{import.meta.env.VITE_APP_NAME || 'SIAKAD'}</div>
            </div>
          </div>

          <div className="topbar__profile">
            <div className="topbar__avatar">
              <LayoutGrid size={20} />
            </div>
            <div>
              <strong>{user?.full_name || user?.username || 'Administrator'}</strong>
              <span>{formatRoleLabel(user)}</span>
            </div>
            <button className="table-action" onClick={logout} type="button">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="content-area">
          <LicenseAlert />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
