import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CalendarRange, Factory, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type InternshipRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  company_id?: number
  company_name?: string
  academic_year_id?: number
  academic_year_name?: string
  start_date?: string
  end_date?: string
  mentor_name?: string
  status?: string
}

type FormValues = {
  student_id: string
  company_id: string
  academic_year_id: string
  start_date: string
  end_date: string
  mentor_name: string
  status: string
}

const endpoint = '/industry-relations/internships'
const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return ''
  return value.slice(0, 10)
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.format(date)
}

function toFormValues(item: InternshipRecord | null): FormValues {
  if (!item) {
    return {
      student_id: '',
      company_id: '',
      academic_year_id: '',
      start_date: '',
      end_date: '',
      mentor_name: '',
      status: 'planned',
    }
  }
  return {
    student_id: String(item.student_id ?? ''),
    company_id: String(item.company_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    start_date: normalizeDateInput(item.start_date),
    end_date: normalizeDateInput(item.end_date),
    mentor_name: String(item.mentor_name ?? ''),
    status: String(item.status ?? 'planned'),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    company_id: Number(values.company_id),
    academic_year_id: Number(values.academic_year_id),
    start_date: values.start_date,
    end_date: values.end_date,
    mentor_name: values.mentor_name.trim(),
    status: values.status.trim() || 'planned',
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'running') return <span className="inline-status inline-status--active">Running</span>
  if (normalized === 'completed') return <span className="inline-status inline-status--male">Completed</span>
  if (normalized === 'planned') return <span className="inline-status inline-status--soft">Planned</span>
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function HubimInternshipsPage() {
  const [items, setItems] = useState<InternshipRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<InternshipRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [companyOptions, setCompanyOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InternshipRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (companyFilter) query.company_id = Number(companyFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (statusFilter !== 'all') query.status = statusFilter
    return query
  }, [academicYearFilter, companyFilter, statusFilter, studentFilter])

  const runningCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'running').length,
    [overviewItems],
  )
  const companyCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.company_name ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const yearCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.academic_year_name ?? '')).filter(Boolean)).size,
    [overviewItems],
  )

  async function refreshList() {
    setLoading(true)
    try {
      const [listResult, overviewResult] = await Promise.all([
        listResource<InternshipRecord>(endpoint, deferredSearch, filterQuery),
        listResource<InternshipRecord>(endpoint),
      ])
      setItems(listResult.items)
      setOverviewItems(overviewResult.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncList() {
      setLoading(true)
      try {
        const [listResult, overviewResult] = await Promise.all([
          listResource<InternshipRecord>(endpoint, deferredSearch, filterQuery),
          listResource<InternshipRecord>(endpoint),
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
        const [students, companies, academicYears] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/industry-relations/companies'),
          listOptions('/master/academic-years'),
        ])
        if (!isMounted) return
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
            value: String(item.id ?? ''),
          })),
        )
        setCompanyOptions(
          companies.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
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

  function handleEditClick(item: InternshipRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleDelete(item: InternshipRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus data prakerin ${item.student_full_name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Data prakerin berhasil dihapus.')
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
        setSuccessMessage('Data prakerin berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Data prakerin berhasil dibuat.')
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
          <h1 className="page-header__title">Internships</h1>
          <p className="page-header__description">
            Kelola penempatan prakerin siswa ke perusahaan mitra per tahun ajaran agar koordinasi HUBIM lebih terstruktur.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Prakerin
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <div className="stat-card__label">Internships</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Total penempatan prakerin yang tercatat di sistem.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <Factory size={18} />
          </div>
          <div>
            <div className="stat-card__label">Running & Companies</div>
            <div className="stat-card__value stat-card__value--compact">{runningCount} running</div>
            <div className="stat-card__copy">{companyCoverage} perusahaan sudah dipakai untuk penempatan siswa.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Academic Years</div>
            <div className="stat-card__value">{yearCoverage}</div>
            <div className="stat-card__copy">Jumlah periode akademik yang sudah punya data prakerin.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <label className="toolbar__search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari siswa, perusahaan, atau mentor..." type="search" />
          </label>
          <div className="toolbar__filters">
            <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="">Semua siswa</option>
              {studentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="">Semua perusahaan</option>
              {companyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={academicYearFilter} onChange={(event) => setAcademicYearFilter(event.target.value)}>
              <option value="">Semua tahun ajaran</option>
              {academicYearOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="planned">Planned</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Perusahaan</th>
                <th>Tahun Ajaran</th>
                <th>Periode</th>
                <th>Mentor</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-empty" colSpan={7}><LoaderCircle className="spin" size={18} /> Memuat data prakerin...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="table-empty" colSpan={7}>Belum ada data prakerin yang cocok dengan filter saat ini.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.student_full_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.student_nis ?? 'Tanpa NIS')}</div>
                    </td>
                    <td><div className="cell-title">{String(item.company_name ?? '-')}</div></td>
                    <td><div className="cell-subtitle">{String(item.academic_year_name ?? '-')}</div></td>
                    <td>
                      <div className="cell-title">{formatDateLabel(item.start_date)}</div>
                      <div className="cell-subtitle">s/d {formatDateLabel(item.end_date)}</div>
                    </td>
                    <td><div className="cell-subtitle">{String(item.mentor_name ?? 'Belum ada mentor')}</div></td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditClick(item)} type="button"><PencilLine size={16} /></button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDelete(item)} type="button"><Trash2 size={16} /></button>
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
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Internship</p>
              <h2 className="panel-heading">{editingItem ? 'Edit Prakerin' : 'Tambah Prakerin'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Siswa</span>
                  <select value={formValues.student_id} onChange={(event) => setFormValues((current) => ({ ...current, student_id: event.target.value }))} required>
                    <option value="">Pilih siswa</option>
                    {studentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Perusahaan</span>
                  <select value={formValues.company_id} onChange={(event) => setFormValues((current) => ({ ...current, company_id: event.target.value }))} required>
                    <option value="">Pilih perusahaan</option>
                    {companyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Tahun Ajaran</span>
                  <select value={formValues.academic_year_id} onChange={(event) => setFormValues((current) => ({ ...current, academic_year_id: event.target.value }))} required>
                    <option value="">Pilih tahun ajaran</option>
                    {academicYearOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}>
                    <option value="planned">Planned</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Tanggal Mulai</span>
                  <input value={formValues.start_date} onChange={(event) => setFormValues((current) => ({ ...current, start_date: event.target.value }))} type="date" />
                </label>
                <label className="form-field">
                  <span>Tanggal Selesai</span>
                  <input value={formValues.end_date} onChange={(event) => setFormValues((current) => ({ ...current, end_date: event.target.value }))} type="date" />
                </label>
                <label className="form-field form-field--full">
                  <span>Mentor Perusahaan</span>
                  <input value={formValues.mentor_name} onChange={(event) => setFormValues((current) => ({ ...current, mentor_name: event.target.value }))} placeholder="Nama mentor dari perusahaan" type="text" />
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan...' : ' Simpan Prakerin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
