import { LayoutGrid, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigationSections } from '../config/navigation'
import { useAuth } from '../contexts/useAuth'

export function AdminLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()

  const currentLabel = useMemo(() => {
    for (const section of navigationSections) {
      const item = section.items.find((entry) => entry.path === location.pathname)
      if (item) {
        return `${section.label} / ${item.label}`
      }
    }
    return 'Portal Admin'
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand__logo">
            <ShieldCheck size={24} />
          </div>
          <div className="sidebar-brand__text">
            <strong>SIAKAD Padang</strong>
            <span>Admin Control Center</span>
          </div>
        </div>

        {navigationSections.map((section) => (
          <section className="sidebar-section" key={section.label}>
            <div className="sidebar-section__label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon

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

        <div className="sidebar-footer">
          Backend Go dan frontend React sekarang sudah searah.
          Modul baru tinggal ditambahkan lewat config dan routing.
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
              <div className="topbar__title">SMAK Negeri Padang</div>
            </div>
          </div>

          <div className="topbar__profile">
            <div className="topbar__avatar">
              <LayoutGrid size={20} />
            </div>
            <div>
              <strong>{user?.full_name || user?.username || 'Administrator'}</strong>
              <span>{user?.role_codes?.join(', ') || 'Portal akademik terpadu'}</span>
            </div>
            <button className="table-action" onClick={logout} type="button">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
