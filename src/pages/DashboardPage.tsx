import { ArrowRight, Database, FolderCog, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardCards } from '../config/navigation'

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <p className="page-header__eyebrow">Portal Admin</p>
        <h1 className="dashboard-hero__title">SIAKAD yang siap dipakai dan siap tumbuh.</h1>
        <p className="dashboard-hero__copy">
          Frontend ini disusun untuk bergerak seirama dengan backend Go yang sudah punya
          resource master dan academic. Kita mulai dari area yang paling matang dulu,
          lalu memperluas modul lain tanpa merombak fondasi layout.
        </p>

        <div className="dashboard-hero__metrics">
          <div className="metric-tile">
            <strong>10</strong>
            <span>CRUD endpoint siap dipakai untuk admin UI</span>
          </div>
          <div className="metric-tile">
            <strong>2</strong>
            <span>resource academic dengan validasi bentrok bisnis</span>
          </div>
          <div className="metric-tile">
            <strong>1</strong>
            <span>design language yang bisa diteruskan ke semua module</span>
          </div>
        </div>
      </section>

      <section className="resource-grid">
        <article className="surface-card">
          <div className="chip-row">
            <span className="chip">
              <Database size={14} />
              Backend sinkron
            </span>
            <span className="chip">
              <Workflow size={14} />
              Vertical slice
            </span>
          </div>
          <h2 className="page-header__title" style={{ fontSize: '2rem', marginTop: '18px' }}>
            Fondasi Admin
          </h2>
          <p className="page-header__description">
            Fokus awal kita adalah dashboard admin, master data, dan modul akademik inti
            agar alur end-to-end cepat terlihat.
          </p>
        </article>

        <article className="surface-card">
          <div className="chip-row">
            <span className="chip">
              <FolderCog size={14} />
              Reusable CRUD
            </span>
          </div>
          <h2 className="page-header__title" style={{ fontSize: '2rem', marginTop: '18px' }}>
            Cepat Diperluas
          </h2>
          <p className="page-header__description">
            Resource page dibuat reusable, jadi modul baru cukup menambah config endpoint,
            field form, dan definisi kolom.
          </p>
        </article>
      </section>

      <section className="module-grid">
        {dashboardCards.map((card) => {
          const Icon = card.icon

          return (
            <Link className="module-card" key={card.path} to={card.path}>
              <div
                className="module-card__icon"
                style={{
                  background: card.accent,
                }}
              >
                <Icon size={30} />
              </div>

              <div>
                <p className="module-card__eyebrow">Quick Access</p>
                <h2 className="module-card__title">{card.title}</h2>
              </div>

              <p className="module-card__body">{card.subtitle}</p>

              <div className="chip-row">
                {card.chips.map((chip) => (
                  <span className="chip" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>

              <div className="chip-row" style={{ marginTop: 'auto' }}>
                <span className="chip">
                  Buka modul
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
