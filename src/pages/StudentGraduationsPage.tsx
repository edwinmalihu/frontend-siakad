import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, GraduationCap, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type StudentGraduationRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  academic_year_id?: number
  academic_year_name?: string
  graduation_date?: string
  status?: string
  notes?: string
}

type FormValues = {
  student_id: string
  academic_year_id: string
  graduation_date: string
  status: string
  notes: string
}

const endpoint = '/student-affairs/graduations'
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

function toFormValues(item: StudentGraduationRecord | null): FormValues {
  if (!item) {
    return { student_id: '', academic_year_id: '', graduation_date: '', status: 'graduated', notes: '' }
  }
  return {
    student_id: String(item.student_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    graduation_date: normalizeDateInput(item.graduation_date),
    status: String(item.status ?? 'graduated'),
    notes: String(item.notes ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    academic_year_id: Number(values.academic_year_id),
    graduation_date: values.graduation_date,
    status: values.status,
    notes: values.notes.trim(),
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'graduated') return <span className="inline-status inline-status--active">Graduated</span>
  if (normalized === 'pending') return <span className="inline-status inline-status--soft">Pending</span>
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function StudentGraduationsPage() {
  const [items, setItems] = useState<StudentGraduationRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<StudentGraduationRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentGraduationRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (statusFilter !== 'all') query.status = statusFilter
    return query
  }, [studentFilter, academicYearFilter, statusFilter])

  const graduatedCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'graduated').length,
    [overviewItems],
  )
  const academicYearCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.academic_year_name ?? '')).filter(Boolean)).size,
    [overviewItems],
  )

  async function fetchGraduations(searchValue: string, query: Record<string, number | string>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<StudentGraduationRecord>(endpoint, searchValue, query),
      listResource<StudentGraduationRecord>(endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchGraduations(deferredSearch, filterQuery)
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
    async function syncGraduations() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchGraduations(deferredSearch, filterQuery)
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
    void syncGraduations()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const [students, academicYears] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/master/academic-years'),
        ])
        if (!isMounted) return
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
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

  function handleEditClick(item: StudentGraduationRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleDelete(item: StudentGraduationRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus data kelulusan ${item.student_full_name ?? ''}?`)
    if (!confirmed) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Data kelulusan berhasil dihapus.')
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
        setSuccessMessage('Data kelulusan berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Data kelulusan berhasil dibuat.')
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
          <p className="page-header__eyebrow">Student Affairs</p>
          <h1 className="page-header__title">Student Graduations</h1>
          <p className="page-header__description">
            Kelola status kelulusan per tahun ajaran agar transisi siswa ke alumni punya rekam jejak yang jelas.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Kelulusan
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon"><GraduationCap size={18} /></div>
          <p className="stat-card__label">Total Records</p>
          <strong className="stat-card__value">{overviewItems.length}</strong>
          <span className="stat-card__hint">Semua riwayat kelulusan siswa.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><CalendarCheck2 size={18} /></div>
          <p className="stat-card__label">Graduated</p>
          <strong className="stat-card__value">{graduatedCount}</strong>
          <span className="stat-card__hint">Siswa yang sudah lulus resmi.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><GraduationCap size={18} /></div>
          <p className="stat-card__label">Academic Year Coverage</p>
          <strong className="stat-card__value">{academicYearCoverage}</strong>
          <span className="stat-card__hint">Jumlah periode kelulusan yang tercatat.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><GraduationCap size={18} /></div>
          <p className="stat-card__label">Student Coverage</p>
          <strong className="stat-card__value">{new Set(overviewItems.map((item) => String(item.student_full_name ?? '')).filter(Boolean)).size}</strong>
          <span className="stat-card__hint">Jumlah siswa yang sudah masuk rekam kelulusan.</span>
        </article>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="toolbar__search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari siswa, NIS, atau tahun ajaran…" />
          </label>
          <div className="toolbar__filters">
            <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="">Semua siswa</option>
              {studentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={academicYearFilter} onChange={(event) => setAcademicYearFilter(event.target.value)}>
              <option value="">Semua tahun ajaran</option>
              {academicYearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="graduated">Graduated</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
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
                <th>Tahun Ajaran</th>
                <th>Tanggal Lulus</th>
                <th>Status</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-empty" colSpan={6}><LoaderCircle className="spin" size={18} />&nbsp;Memuat data kelulusan…</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="table-empty" colSpan={6}>Belum ada data kelulusan yang cocok dengan filter saat ini.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.student_full_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.student_nis ?? 'Tanpa NIS'}</div>
                    </td>
                    <td>{item.academic_year_name ?? '-'}</td>
                    <td>{formatDateLabel(item.graduation_date)}</td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>{item.notes ?? '-'}</td>
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
        <div className="modal-backdrop" onClick={() => setModalOpen(false)} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-card__header">
              <div>
                <p className="page-header__eyebrow">Student Affairs Form</p>
                <h2>{editingItem ? 'Edit Kelulusan' : 'Tambah Kelulusan'}</h2>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} type="button">×</button>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Siswa</span>
                <select required value={formValues.student_id} onChange={(event) => setFormValues((current) => ({ ...current, student_id: event.target.value }))}>
                  <option value="">Pilih siswa</option>
                  {studentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Tahun Ajaran</span>
                <select required value={formValues.academic_year_id} onChange={(event) => setFormValues((current) => ({ ...current, academic_year_id: event.target.value }))}>
                  <option value="">Pilih tahun ajaran</option>
                  {academicYearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Tanggal Lulus</span>
                <input type="date" value={formValues.graduation_date} onChange={(event) => setFormValues((current) => ({ ...current, graduation_date: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select required value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}>
                  <option value="graduated">Graduated</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="form-field form-field--full">
                <span>Catatan</span>
                <textarea rows={4} value={formValues.notes} onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="form-actions">
                <button className="button button--ghost" onClick={() => setModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Kelulusan'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
