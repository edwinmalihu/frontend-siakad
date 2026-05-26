import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, GraduationCap, LoaderCircle, Search, ShieldAlert, Users2 } from 'lucide-react'
import { extractError, getResource, listResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type SearchResult = ResourceRecord & {
  id?: number
  nis?: string
  full_name?: string
  gender?: string
  status?: string
  entry_year?: number
  class_name?: string
  department_code?: string
  grade_level_code?: string
  academic_year_name?: string
  semester_name?: string
  discipline_count?: number
  discipline_point_total?: number
  attendance_count?: number
  extracurricular_count?: number
  internship_status?: string
  internship_company_name?: string
  alumni_activity?: string
}

type SearchDetail = ResourceRecord & {
  student?: {
    id?: number
    nis?: string
    nisn?: string
    full_name?: string
    gender?: string
    status?: string
    entry_year?: number
    birth_place?: string
    birth_date?: string
    address?: string
    phone?: string
  }
  latest_enrollment?: {
    class_name?: string
    department_code?: string
    department_name?: string
    grade_level_code?: string
    grade_level_name?: string
    academic_year_name?: string
    semester_name?: string
    status?: string
  } | null
  latest_mutation?: {
    mutation_type?: string
    from_school?: string
    to_school?: string
    reason?: string
    effective_date?: string
    status?: string
  } | null
  graduation?: {
    academic_year_name?: string
    graduation_date?: string
    status?: string
    notes?: string
  } | null
  latest_internship?: {
    company_name?: string
    academic_year_name?: string
    start_date?: string
    end_date?: string
    mentor_name?: string
    status?: string
  } | null
  alumni?: {
    graduation_year?: number
    current_activity?: string
    company_name?: string
    college_name?: string
    phone?: string
    email?: string
  } | null
  stats?: {
    attendance_total?: number
    attendance_present?: number
    attendance_absent?: number
    attendance_excused?: number
    discipline_count?: number
    discipline_point_total?: number
    extracurricular_count?: number
  }
  extracurriculars?: Array<{
    name?: string
    academic_year_name?: string
    status?: string
  }>
  recent_attendances?: Array<{
    date?: string
    status?: string
    class?: string
  }>
  recent_disciplines?: Array<{
    incident_date?: string
    category_name?: string
    point?: number
    action_taken?: string
    description?: string
  }>
}

const endpoint = '/shared/student-search'
const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'hubim', label: 'HUBIM' },
] as const

type DetailTab = (typeof tabs)[number]['key']

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.format(date)
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active' || normalized === 'present' || normalized === 'running' || normalized === 'published') {
    return <span className="inline-status inline-status--active">{String(value ?? '-')}</span>
  }
  if (normalized === 'male' || normalized === 'college' || normalized === 'completed') {
    return <span className="inline-status inline-status--male">{String(value ?? '-')}</span>
  }
  if (normalized === 'female') {
    return <span className="inline-status inline-status--female">{String(value ?? '-')}</span>
  }
  if (normalized === 'draft' || normalized === 'planned' || normalized === 'seeking') {
    return <span className="inline-status inline-status--soft">{String(value ?? '-')}</span>
  }
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function SearchStudentsPage() {
  const [items, setItems] = useState<SearchResult[]>([])
  const [selectedID, setSelectedID] = useState<number | null>(null)
  const [detail, setDetail] = useState<SearchDetail | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const activeCount = useMemo(
    () => items.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
    [items],
  )
  const alumniCount = useMemo(
    () => items.filter((item) => String(item.alumni_activity ?? '').trim() !== '').length,
    [items],
  )
  const internshipCount = useMemo(
    () => items.filter((item) => String(item.internship_status ?? '').trim() !== '').length,
    [items],
  )

  useEffect(() => {
    let isMounted = true
    async function syncResults() {
      setLoading(true)
      try {
        setErrorMessage('')
        const query = statusFilter === 'all' ? undefined : { status: statusFilter }
        const result = await listResource<SearchResult>(endpoint, deferredSearch, query)
        if (!isMounted) return
        setItems(result.items)
        setSelectedID((current) => {
          if (current && result.items.some((item) => Number(item.id) === current)) {
            return current
          }
          return result.items[0]?.id ? Number(result.items[0].id) : null
        })
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
        setItems([])
        setSelectedID(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void syncResults()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, statusFilter])

  useEffect(() => {
    let isMounted = true
    async function syncDetail() {
      if (!selectedID) {
        setDetail(null)
        return
      }
      setDetailLoading(true)
      try {
        setErrorMessage('')
        const result = await getResource<SearchDetail>(endpoint, selectedID)
        if (!isMounted) return
        setDetail(result)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
        setDetail(null)
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }
    void syncDetail()
    return () => {
      isMounted = false
    }
  }, [selectedID])

  function handleExportSummary() {
    if (!detail?.student) {
      return
    }
    const lines = [
      'RINGKASAN SISWA',
      '',
      `Nama: ${detail.student.full_name ?? '-'}`,
      `NIS: ${detail.student.nis ?? '-'}`,
      `NISN: ${detail.student.nisn ?? '-'}`,
      `Gender: ${detail.student.gender ?? '-'}`,
      `Status: ${detail.student.status ?? '-'}`,
      `Angkatan: ${detail.student.entry_year ?? '-'}`,
      `Kelas Terakhir: ${detail.latest_enrollment?.class_name ?? '-'}`,
      `Periode: ${[detail.latest_enrollment?.academic_year_name, detail.latest_enrollment?.semester_name].filter(Boolean).join(' / ') || '-'}`,
      '',
      'STATISTIK',
      `Absensi total: ${detail.stats?.attendance_total ?? 0}`,
      `Hadir: ${detail.stats?.attendance_present ?? 0}`,
      `Absent/Alpha: ${detail.stats?.attendance_absent ?? 0}`,
      `Excused lainnya: ${detail.stats?.attendance_excused ?? 0}`,
      `Disiplin count: ${detail.stats?.discipline_count ?? 0}`,
      `Disiplin poin: ${detail.stats?.discipline_point_total ?? 0}`,
      `Ekskul count: ${detail.stats?.extracurricular_count ?? 0}`,
      '',
      'HUBIM',
      `Prakerin: ${detail.latest_internship?.company_name ?? '-'} (${detail.latest_internship?.status ?? '-'})`,
      `Alumni: ${detail.alumni?.current_activity ?? '-'} ${detail.alumni?.company_name || detail.alumni?.college_name ? `- ${detail.alumni?.company_name || detail.alumni?.college_name}` : ''}`,
      '',
      'ABSENSI TERBARU',
      ...(detail.recent_attendances?.length
        ? detail.recent_attendances.map((item) => `- ${formatDateLabel(item.date)} | ${item.class ?? '-'} | ${item.status ?? '-'}`)
        : ['- Tidak ada data']),
      '',
      'DISIPLIN TERBARU',
      ...(detail.recent_disciplines?.length
        ? detail.recent_disciplines.map((item) => `- ${formatDateLabel(item.incident_date)} | ${item.category_name ?? '-'} | ${item.point ?? 0} poin`)
        : ['- Tidak ada data']),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `student-summary-${detail.student.nis ?? detail.student.id ?? 'unknown'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Shared Module</p>
          <h1 className="page-header__title">Cari Siswa</h1>
          <p className="page-header__description">
            Aggregator lintas modul untuk melihat siswa dari satu titik: biodata, kelas aktif, absensi, disiplin,
            ekskul, prakerin, sampai status alumni.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Hasil Ditemukan</div>
            <div className="stat-card__value">{items.length}</div>
            <div className="stat-card__copy">Daftar siswa yang cocok dengan keyword dan filter aktif.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <BookOpenCheck size={18} />
          </div>
          <div>
            <div className="stat-card__label">Siswa Aktif</div>
            <div className="stat-card__value">{activeCount}</div>
            <div className="stat-card__copy">Membantu operator cepat memisahkan siswa aktif dari riwayat lama.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Alumni / Prakerin</div>
            <div className="stat-card__value stat-card__value--compact">{alumniCount} / {internshipCount}</div>
            <div className="stat-card__copy">Ringkasan cepat untuk jejak siswa yang sudah sampai HUBIM.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Lookup</p>
            <h2 className="panel-heading">Student Search Console</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari berdasarkan nama, NIS, atau NISN..."
                type="search"
              />
            </label>
            <div className="toolbar__filters">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
                <option value="mutated">Mutated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas Terakhir</th>
                <th>Absensi / Disiplin</th>
                <th>HUBIM</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    <LoaderCircle className="spin" size={18} /> Memuat hasil pencarian siswa...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={4}>Belum ada siswa yang cocok dengan pencarian saat ini.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={String(item.id)}
                    onClick={() => setSelectedID(Number(item.id))}
                    style={{ cursor: 'pointer', background: selectedID === Number(item.id) ? 'rgba(26, 196, 214, 0.08)' : undefined }}
                  >
                    <td>
                      <div className="cell-title">{String(item.full_name ?? '-')}</div>
                      <div className="cell-subtitle">
                        {String(item.nis ?? '-')} · <StatusBadge value={item.status} />
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.class_name ?? 'Belum ada kelas')}</div>
                      <div className="cell-subtitle">
                        {[item.grade_level_code, item.department_code, item.academic_year_name].filter(Boolean).join(' · ') || 'Belum ada enrollment'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{Number(item.attendance_count ?? 0)} absensi</div>
                      <div className="cell-subtitle">
                        {Number(item.discipline_count ?? 0)} pelanggaran · {Number(item.discipline_point_total ?? 0)} poin
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.internship_company_name ?? item.alumni_activity ?? 'Belum ada jejak')}</div>
                      <div className="cell-subtitle">
                        {String(item.internship_status ?? item.alumni_activity ?? '-')}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__body">
          <div className="page-header">
            <div>
              <p className="page-header__eyebrow">Detail Agregasi</p>
              <h2 className="panel-heading">Student Profile Lens</h2>
            </div>
            <div className="page-header__actions">
              <div className="toolbar__filters">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`segmented-button ${activeTab === tab.key ? 'segmented-button--active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button className="button-ghost" disabled={!detail?.student} onClick={handleExportSummary} type="button">
                Export Ringkasan
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="table-empty"><LoaderCircle className="spin" size={18} /> Memuat detail siswa...</div>
          ) : !detail?.student ? (
            <div className="placeholder-card">
              <strong>Pilih satu siswa dari hasil pencarian.</strong>
              Detail lintas modul akan langsung tampil di sini begitu satu hasil dipilih.
            </div>
          ) : (
            <div className="page-stack">
              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-card__icon stat-card__icon--sky">
                    <Users2 size={18} />
                  </div>
                  <div>
                    <div className="stat-card__label">Profil Dasar</div>
                    <div className="stat-card__value stat-card__value--compact">{String(detail.student.full_name ?? '-')}</div>
                    <div className="stat-card__copy">
                      {String(detail.student.nis ?? '-')} · {String(detail.student.gender ?? '-')} · angkatan {String(detail.student.entry_year ?? '-')}
                    </div>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-card__icon stat-card__icon--teal">
                    <BookOpenCheck size={18} />
                  </div>
                  <div>
                    <div className="stat-card__label">Absensi</div>
                    <div className="stat-card__value">{Number(detail.stats?.attendance_total ?? 0)}</div>
                    <div className="stat-card__copy">
                      Hadir {Number(detail.stats?.attendance_present ?? 0)} · Alpha {Number(detail.stats?.attendance_absent ?? 0)}
                    </div>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-card__icon stat-card__icon--amber">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="stat-card__label">Disiplin</div>
                    <div className="stat-card__value">{Number(detail.stats?.discipline_point_total ?? 0)}</div>
                    <div className="stat-card__copy">
                      {Number(detail.stats?.discipline_count ?? 0)} catatan pelanggaran terdata.
                    </div>
                  </div>
                </article>
              </section>

              {activeTab === 'overview' ? (
                <>
                  <section className="resource-grid">
                    <article className="surface-card">
                      <p className="page-header__eyebrow">Enrollment</p>
                      <h3 className="panel-heading">Kelas Aktif / Terakhir</h3>
                      {detail.latest_enrollment ? (
                        <div className="page-stack" style={{ gap: 10 }}>
                          <div className="cell-title">{detail.latest_enrollment.class_name}</div>
                          <div className="cell-subtitle">
                            {[detail.latest_enrollment.grade_level_code, detail.latest_enrollment.department_code].filter(Boolean).join(' · ')}
                          </div>
                          <div className="cell-subtitle">
                            {[detail.latest_enrollment.academic_year_name, detail.latest_enrollment.semester_name, detail.latest_enrollment.status].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      ) : (
                        <div className="cell-subtitle">Belum ada data enrollment.</div>
                      )}
                    </article>

                    <article className="surface-card">
                      <p className="page-header__eyebrow">Lifecycle</p>
                      <h3 className="panel-heading">Mutasi & Kelulusan</h3>
                      <div className="page-stack" style={{ gap: 12 }}>
                        <div>
                          <div className="cell-title">{detail.latest_mutation?.mutation_type ?? 'Belum ada mutasi'}</div>
                          <div className="cell-subtitle">
                            {[detail.latest_mutation?.effective_date, detail.latest_mutation?.status].filter(Boolean).join(' · ') || 'Belum ada riwayat mutasi'}
                          </div>
                        </div>
                        <div>
                          <div className="cell-title">{detail.graduation?.status ?? 'Belum ada status kelulusan'}</div>
                          <div className="cell-subtitle">
                            {[detail.graduation?.graduation_date, detail.graduation?.academic_year_name].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className="resource-grid">
                    <article className="surface-card">
                      <p className="page-header__eyebrow">Extracurricular</p>
                      <h3 className="panel-heading">Keanggotaan Ekskul</h3>
                      {detail.extracurriculars?.length ? (
                        <div className="page-stack" style={{ gap: 10 }}>
                          {detail.extracurriculars.map((item, index) => (
                            <div key={`${item.name}-${index}`}>
                              <div className="cell-title">{item.name}</div>
                              <div className="cell-subtitle">
                                {[item.academic_year_name, item.status].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="cell-subtitle">Belum ada riwayat ekskul.</div>
                      )}
                    </article>
                  </section>
                </>
              ) : null}

              {activeTab === 'attendance' ? (
                <section className="resource-grid">
                  <article className="surface-card">
                    <p className="page-header__eyebrow">Recent Attendances</p>
                    <h3 className="panel-heading">Absensi Terbaru</h3>
                    {detail.recent_attendances?.length ? (
                      <div className="page-stack" style={{ gap: 10 }}>
                        {detail.recent_attendances.map((item, index) => (
                          <div key={`${item.date}-${index}`}>
                            <div className="cell-title">{formatDateLabel(item.date)}</div>
                            <div className="cell-subtitle">
                              {[item.class, item.status].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="cell-subtitle">Belum ada absensi.</div>
                    )}
                  </article>
                </section>
              ) : null}

              {activeTab === 'discipline' ? (
                <section className="resource-grid">
                  <article className="surface-card">
                    <p className="page-header__eyebrow">Recent Discipline</p>
                    <h3 className="panel-heading">Disiplin Terbaru</h3>
                    {detail.recent_disciplines?.length ? (
                      <div className="page-stack" style={{ gap: 10 }}>
                        {detail.recent_disciplines.map((item, index) => (
                          <div key={`${item.incident_date}-${index}`}>
                            <div className="cell-title">{item.category_name} · {item.point} poin</div>
                            <div className="cell-subtitle">
                              {[formatDateLabel(item.incident_date), item.action_taken || item.description].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="cell-subtitle">Belum ada catatan disiplin.</div>
                    )}
                  </article>
                </section>
              ) : null}

              {activeTab === 'hubim' ? (
                <section className="resource-grid">
                  <article className="surface-card">
                    <p className="page-header__eyebrow">HUBIM</p>
                    <h3 className="panel-heading">Prakerin & Alumni</h3>
                    <div className="page-stack" style={{ gap: 12 }}>
                      <div>
                        <div className="cell-title">{detail.latest_internship?.company_name ?? 'Belum ada prakerin'}</div>
                        <div className="cell-subtitle">
                          {[detail.latest_internship?.status, detail.latest_internship?.academic_year_name].filter(Boolean).join(' · ') || 'Belum ada status prakerin'}
                        </div>
                      </div>
                      <div>
                        <div className="cell-title">{detail.alumni?.current_activity ?? 'Belum menjadi alumni'}</div>
                        <div className="cell-subtitle">
                          {detail.alumni?.company_name || detail.alumni?.college_name || 'Belum ada data alumni'}
                        </div>
                      </div>
                    </div>
                  </article>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
