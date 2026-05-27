import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Calendar, ChevronDown, Clock, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardCards } from '../config/navigation'
import { useAuth } from '../contexts/useAuth'
import { extractError, listResource } from '../lib/api'
import { hasRoleAccess } from '../lib/access-control'
import type { ResourceRecord } from '../types/resources'

type AnnouncementRecord = ResourceRecord & {
  id?: number
  title?: string
  content?: string
  target_scope?: string
  is_published?: boolean
  publish_start?: string
  publish_end?: string
  created_at?: string
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatGreetingDate(date: Date): string {
  const day = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  const year = date.getFullYear()
  return `${day}, ${dayNum} ${month} ${year}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB'
}

function formatAnnouncementDate(value: string | undefined) {
  if (!value) return { day: '-', time: '' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { day: value, time: '' }
  const day = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB'
  return { day, time }
}

function scopeColor(scope: string | undefined) {
  const s = String(scope ?? '').toLowerCase()
  if (s === 'students' || s === 'student') return 'inline-status--male'
  if (s === 'teachers' || s === 'teacher') return 'inline-status--active'
  if (s === 'academic') return 'inline-status--soft'
  if (s === 'all' || s === 'public') return 'inline-status--female'
  return 'inline-status--inactive'
}

function scopeIconColor(scope: string | undefined) {
  const s = String(scope ?? '').toLowerCase()
  if (s === 'students' || s === 'student') return '#4ba8ff'
  if (s === 'teachers' || s === 'teacher') return '#60c14c'
  if (s === 'academic') return '#1ac4d6'
  if (s === 'all' || s === 'public') return '#ff986d'
  return '#8b5cf6'
}

const INITIAL_ANNOUNCEMENT_COUNT = 3

export function DashboardPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [announcementError, setAnnouncementError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const result = await listResource<AnnouncementRecord>('/shared/announcements', '', { is_published: 'true' })
        if (!isMounted) return
        setAnnouncements(result.items)
      } catch (error) {
        if (!isMounted) return
        setAnnouncementError(extractError(error))
      } finally {
        if (isMounted) setLoadingAnnouncements(false)
      }
    }
    void load()
    return () => { isMounted = false }
  }, [])

  const visibleCards = useMemo(
    () => dashboardCards.filter((card) => hasRoleAccess(user, card.allowedRoleCodes)),
    [user],
  )

  const visibleAnnouncements = useMemo(
    () => showAll ? announcements : announcements.slice(0, INITIAL_ANNOUNCEMENT_COUNT),
    [announcements, showAll],
  )

  const displayName = user?.full_name || user?.username || 'User'

  return (
    <div className="page-stack">
      {/* Greeting Header */}
      <section className="dashboard-greeting">
        <div className="dashboard-greeting__text">
          <p className="dashboard-greeting__eyebrow">Selamat datang kembali,</p>
          <h1 className="dashboard-greeting__name">{displayName} 👋</h1>
        </div>
        <div className="dashboard-datetime">
          <Calendar size={18} className="dashboard-datetime__icon" />
          <span className="dashboard-datetime__date">{formatGreetingDate(now)}</span>
          <span className="dashboard-datetime__time">{formatTime(now)}</span>
        </div>
      </section>

      {/* Quick Access */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <span className="dashboard-section__label">
            <Megaphone size={14} className="dashboard-section__label-icon" />
            Quick Access
          </span>
        </div>

        {visibleCards.length === 0 ? (
          <div className="dashboard-empty">
            Tidak ada modul quick access untuk role Anda saat ini.
          </div>
        ) : (
          <div className="module-grid">
            {visibleCards.map((card) => {
              const Icon = card.icon
              return (
                <Link className="module-card" key={card.path} to={card.path}>
                  <div className="module-card__icon" style={{ background: card.accent }}>
                    <Icon size={28} />
                  </div>
                  <div>
                    <h2 className="module-card__title">{card.title}</h2>
                  </div>
                  <p className="module-card__body">{card.subtitle}</p>
                  <div className="module-card__arrow">
                    <ArrowRight size={16} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Pengumuman Terbaru */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <span className="dashboard-section__label">
            <Megaphone size={14} className="dashboard-section__label-icon" />
            Pengumuman Terbaru
          </span>
          <Link className="dashboard-section__link" to="/announcements">
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>

        {loadingAnnouncements ? (
          <div className="dashboard-announcements">
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>
              Memuat pengumuman...
            </div>
          </div>
        ) : announcementError ? (
          <div className="dashboard-announcements">
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>
              Gagal memuat pengumuman.
            </div>
          </div>
        ) : visibleAnnouncements.length === 0 ? (
          <div className="dashboard-announcements">
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>
              Belum ada pengumuman.
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-announcements">
              {visibleAnnouncements.map((item) => {
                const dateInfo = formatAnnouncementDate(item.created_at)
                const iconBg = scopeIconColor(item.target_scope)
                return (
                  <div className="dashboard-announcement" key={String(item.id)}>
                    <div className="dashboard-announcement__icon" style={{ background: iconBg }}>
                      <Megaphone size={18} />
                    </div>
                    <div className="dashboard-announcement__content">
                      <p className="dashboard-announcement__title">
                        <span className="dashboard-announcement__dot" style={{ background: iconBg }} />
                        {String(item.title ?? '-')}
                      </p>
                      <p className="dashboard-announcement__copy">{String(item.content ?? '')}</p>
                    </div>
                    {item.target_scope ? (
                      <span className={`dashboard-announcement__badge inline-status ${scopeColor(item.target_scope)}`}>
                        {String(item.target_scope)}
                      </span>
                    ) : null}
                    <div className="dashboard-announcement__date">
                      <span className="dashboard-announcement__date-day">{dateInfo.day}</span>
                      {dateInfo.time ? (
                        <span className="dashboard-announcement__date-time">{dateInfo.time}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
            {announcements.length > INITIAL_ANNOUNCEMENT_COUNT && !showAll ? (
              <div className="dashboard-load-more">
                <button onClick={() => setShowAll(true)} type="button">
                  Tampilkan lebih banyak <ChevronDown size={16} />
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
