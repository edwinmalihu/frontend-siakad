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
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">HUBIM</p>
          <h1 className="page-header__title">Alumni</h1>
          <p className="page-header__description">
            Pusat untuk memetakan lulusan, aktivitas pasca-sekolah, dan jejak kerja atau studi lanjut yang nanti akan
            sangat berguna untuk pelaporan sekolah.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" type="button" onClick={handleCreateClick}>
            <Plus size={18} />
            &nbsp;Tambah Alumni
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Alumni</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Seluruh siswa yang sudah dipindahkan menjadi jejak alumni sekolah.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <div className="stat-card__label">Working Alumni</div>
            <div className="stat-card__value">{workingCount}</div>
            <div className="stat-card__copy">Jumlah alumni yang saat ini sudah tercatat bekerja.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <University size={18} />
          </div>
          <div>
            <div className="stat-card__label">College Alumni</div>
            <div className="stat-card__value">{collegeCount}</div>
            <div className="stat-card__copy">Lulusan yang sedang atau sudah melanjutkan studi.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Activity Coverage</div>
            <div className="stat-card__value">{activityCoverage}</div>
            <div className="stat-card__copy">Cakupan ragam aktivitas alumni yang sudah terdokumentasi.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div className="toolbar__search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Cari alumni, NIS, perusahaan, kampus, atau email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="toolbar__filters">
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

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
          </div>
        </div>

        {loading ? (
          <div className="panel__body">
            <div className="loading-line" />
            <div className="loading-line" style={{ marginTop: '14px' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada data alumni.</strong>
              Tambahkan data alumni untuk memetakan jejak lulusan sekolah.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.student_full_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.student_nis ?? 'Tanpa NIS'}</div>
                    </td>
                    <td>{item.graduation_year ?? '-'}</td>
                    <td>
                      <ActivityBadge value={item.current_activity} />
                    </td>
                    <td>
                      <div className="cell-title">{item.company_name || item.college_name || '-'}</div>
                      <div className="cell-subtitle">{item.company_name && item.college_name ? item.college_name : item.company_name ? 'Tempat kerja' : item.college_name ? 'Perguruan tinggi' : 'Belum diisi'}</div>
                    </td>
                    <td>
                      <div className="cell-title">{item.phone || '-'}</div>
                      <div className="cell-subtitle">{item.email || 'Tanpa email'}</div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-action" onClick={() => handleEditClick(item)}>
                          <PencilLine size={15} />
                        </button>
                        <button type="button" className="table-action table-action--danger" onClick={() => handleDelete(item)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Alumni' : 'Tambah Alumni'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui data alumni.'
                  : 'Tambahkan data alumni untuk memetakan jejak lulusan.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="student_id">Siswa *</label>
                  <select
                    id="student_id"
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
                </div>

                <div className="field">
                  <label htmlFor="graduation_year">Tahun Lulus *</label>
                  <input
                    id="graduation_year"
                    type="number"
                    min="2000"
                    max="2200"
                    value={formValues.graduation_year}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, graduation_year: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="current_activity">Aktivitas Saat Ini *</label>
                  <select
                    id="current_activity"
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
                </div>

                <div className="field">
                  <label htmlFor="company_name">Perusahaan</label>
                  <input
                    id="company_name"
                    type="text"
                    value={formValues.company_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, company_name: event.target.value }))}
                    placeholder="Opsional"
                  />
                </div>

                <div className="field">
                  <label htmlFor="college_name">Perguruan Tinggi</label>
                  <input
                    id="college_name"
                    type="text"
                    value={formValues.college_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, college_name: event.target.value }))}
                    placeholder="Opsional"
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone">Telepon</label>
                  <input
                    id="phone"
                    type="text"
                    value={formValues.phone}
                    onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Opsional"
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={formValues.email}
                    onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="button-ghost" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="button" disabled={submitting}>
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Tambah Alumni'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
