import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, GraduationCap, LoaderCircle, PencilLine, Plus, Search, Trash2, University } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type AlumniRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  graduation_year?: number
  current_activity?: string
  company_name?: string
  college_name?: string
  phone?: string
  email?: string
}

type FormValues = {
  student_id: string
  graduation_year: string
  current_activity: string
  company_name: string
  college_name: string
  phone: string
  email: string
}

const endpoint = '/industry-relations/alumni'
const activityOptions = [
  { label: 'Working', value: 'working' },
  { label: 'College', value: 'college' },
  { label: 'Entrepreneur', value: 'entrepreneur' },
  { label: 'Seeking', value: 'seeking' },
  { label: 'Other', value: 'other' },
] satisfies StaticOption[]

function toFormValues(item: AlumniRecord | null): FormValues {
  if (!item) {
    return {
      student_id: '',
      graduation_year: '',
      current_activity: 'working',
      company_name: '',
      college_name: '',
      phone: '',
      email: '',
    }
  }
  return {
    student_id: String(item.student_id ?? ''),
    graduation_year: String(item.graduation_year ?? ''),
    current_activity: String(item.current_activity ?? 'working'),
    company_name: String(item.company_name ?? ''),
    college_name: String(item.college_name ?? ''),
    phone: String(item.phone ?? ''),
    email: String(item.email ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    graduation_year: Number(values.graduation_year),
    current_activity: values.current_activity.trim(),
    company_name: values.company_name.trim(),
    college_name: values.college_name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
  }
}

function ActivityBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'working') return <span className="inline-status inline-status--active">Working</span>
  if (normalized === 'college') return <span className="inline-status inline-status--male">College</span>
  if (normalized === 'entrepreneur') return <span className="inline-status inline-status--female">Entrepreneur</span>
  if (normalized === 'seeking') return <span className="inline-status inline-status--soft">Seeking</span>
  if (normalized === 'other') return <span className="inline-status inline-status--inactive">Other</span>
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function HubimAlumniPage() {
  const [items, setItems] = useState<AlumniRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AlumniRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [graduationYearFilter, setGraduationYearFilter] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AlumniRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (graduationYearFilter) query.graduation_year = Number(graduationYearFilter)
    if (activityFilter !== 'all') query.current_activity = activityFilter
    return query
  }, [activityFilter, graduationYearFilter, studentFilter])

  const activityCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.current_activity ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const workingCount = useMemo(
    () => overviewItems.filter((item) => String(item.current_activity ?? '').toLowerCase() === 'working').length,
    [overviewItems],
  )
  const collegeCount = useMemo(
    () => overviewItems.filter((item) => String(item.current_activity ?? '').toLowerCase() === 'college').length,
    [overviewItems],
  )
  const graduationYearOptions = useMemo(() => {
    return Array.from(
      new Set(overviewItems.map((item) => Number(item.graduation_year ?? 0)).filter((year) => year > 0)),
    ).sort((left, right) => right - left)
  }, [overviewItems])

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const [listResult, overviewResult] = await Promise.all([
        listResource<AlumniRecord>(endpoint, deferredSearch, filterQuery),
        listResource<AlumniRecord>(endpoint),
      ])
      setItems(listResult.items)
      setOverviewItems(overviewResult.items)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncList() {
      setLoading(true)
      try {
        setErrorMessage('')
        const [listResult, overviewResult] = await Promise.all([
          listResource<AlumniRecord>(endpoint, deferredSearch, filterQuery),
          listResource<AlumniRecord>(endpoint),
        ])
        if (!isMounted) return
        setItems(listResult.items)
        setOverviewItems(overviewResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void syncList()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const students = await listOptions('/student-affairs/students')
        if (!isMounted) return
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }
    void syncOptions()
    return () => {
      isMounted = false
    }
  }, [])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: AlumniRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleDelete(item: AlumniRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus data alumni ${item.student_full_name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Data alumni berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toPayload(formValues)
      if (editingItem?.id) {
        await updateResource(endpoint, Number(editingItem.id), payload)
        setSuccessMessage('Data alumni berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Data alumni berhasil dibuat.')
      }
      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">HUBIM</p>
          <h1>ALUMNI</h1>
          <p className="hero-copy">
            Pusat untuk memetakan lulusan, aktivitas pasca-sekolah, dan jejak kerja atau studi lanjut yang nanti akan
            sangat berguna untuk pelaporan sekolah.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={handleCreateClick}>
          <Plus size={18} />
          Tambah Alumni
        </button>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon">
            <GraduationCap size={18} />
          </div>
          <p className="stat-card__label">Total Alumni</p>
          <strong>{overviewItems.length}</strong>
          <span>Seluruh siswa yang sudah dipindahkan menjadi jejak alumni sekolah.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <BriefcaseBusiness size={18} />
          </div>
          <p className="stat-card__label">Working Alumni</p>
          <strong>{workingCount}</strong>
          <span>Jumlah alumni yang saat ini sudah tercatat bekerja.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <University size={18} />
          </div>
          <p className="stat-card__label">College Alumni</p>
          <strong>{collegeCount}</strong>
          <span>Lulusan yang sedang atau sudah melanjutkan studi.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <GraduationCap size={18} />
          </div>
          <p className="stat-card__label">Activity Coverage</p>
          <strong>{activityCoverage}</strong>
          <span>Cakupan ragam aktivitas alumni yang sudah terdokumentasi.</span>
        </article>
      </section>

      <section className="resource-panel">
        <div className="resource-toolbar">
          <label className="searchbox">
            <Search size={18} />
            <input
              type="search"
              placeholder="Cari alumni, NIS, perusahaan, kampus, atau email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="toolbar-filters">
            <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="">Semua siswa</option>
              {studentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={graduationYearFilter} onChange={(event) => setGraduationYearFilter(event.target.value)}>
              <option value="">Semua tahun lulus</option>
              {graduationYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              <option value="all">Semua aktivitas</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
        {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Tahun Lulus</th>
                <th>Aktivitas</th>
                <th>Perusahaan / Kampus</th>
                <th>Kontak</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <LoaderCircle className="spin" size={18} />
                      Memuat data alumni...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">Belum ada data alumni yang cocok dengan filter saat ini.</div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-primary">
                        <strong>{item.student_full_name ?? '-'}</strong>
                        <span>{item.student_nis ?? 'Tanpa NIS'}</span>
                      </div>
                    </td>
                    <td>{item.graduation_year ?? '-'}</td>
                    <td>
                      <ActivityBadge value={item.current_activity} />
                    </td>
                    <td>
                      <div className="table-primary">
                        <strong>{item.company_name || item.college_name || '-'}</strong>
                        <span>{item.company_name && item.college_name ? item.college_name : item.company_name ? 'Tempat kerja' : item.college_name ? 'Perguruan tinggi' : 'Belum diisi'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-primary">
                        <strong>{item.phone || '-'}</strong>
                        <span>{item.email || 'Tanpa email'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-button" onClick={() => handleEditClick(item)}>
                          <PencilLine size={16} />
                        </button>
                        <button type="button" className="icon-button icon-button--danger" onClick={() => handleDelete(item)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">HUBIM / Alumni</p>
                <h2>{editingItem ? 'Edit Alumni' : 'Tambah Alumni'}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setModalOpen(false)}>
                Tutup
              </button>
            </div>

            <form className="resource-form" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Siswa</span>
                <select
                  value={formValues.student_id}
                  onChange={(event) => setFormValues((current) => ({ ...current, student_id: event.target.value }))}
                  required
                >
                  <option value="">Pilih siswa</option>
                  {studentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid form-grid--two">
                <label className="form-field">
                  <span>Tahun Lulus</span>
                  <input
                    type="number"
                    min="2000"
                    max="2200"
                    value={formValues.graduation_year}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, graduation_year: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Aktivitas Saat Ini</span>
                  <select
                    value={formValues.current_activity}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, current_activity: event.target.value }))
                    }
                    required
                  >
                    {activityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid form-grid--two">
                <label className="form-field">
                  <span>Perusahaan</span>
                  <input
                    type="text"
                    value={formValues.company_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, company_name: event.target.value }))}
                    placeholder="Opsional"
                  />
                </label>

                <label className="form-field">
                  <span>Perguruan Tinggi</span>
                  <input
                    type="text"
                    value={formValues.college_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, college_name: event.target.value }))}
                    placeholder="Opsional"
                  />
                </label>
              </div>

              <div className="form-grid form-grid--two">
                <label className="form-field">
                  <span>Telepon</span>
                  <input
                    type="text"
                    value={formValues.phone}
                    onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Opsional"
                  />
                </label>

                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Opsional"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="ghost-button" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoaderCircle className="spin" size={18} />
                      Menyimpan...
                    </>
                  ) : editingItem ? (
                    'Simpan perubahan'
                  ) : (
                    'Tambah alumni'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
