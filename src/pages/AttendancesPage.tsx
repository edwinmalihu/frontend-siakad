import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardCheck, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type AttendanceRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  class_id?: number
  class_name?: string
  department_code?: string
  department_name?: string
  grade_level_code?: string
  grade_level_name?: string
  attendance_date?: string
  status?: string
  notes?: string
  recorded_by?: number
  recorded_by_name?: string
}

type FormValues = {
  student_id: string
  class_id: string
  attendance_date: string
  status: string
  notes: string
}

const endpoint = '/student-affairs/attendances'
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

function toFormValues(item: AttendanceRecord | null): FormValues {
  if (!item) {
    return { student_id: '', class_id: '', attendance_date: '', status: 'present', notes: '' }
  }
  return {
    student_id: String(item.student_id ?? ''),
    class_id: String(item.class_id ?? ''),
    attendance_date: normalizeDateInput(item.attendance_date),
    status: String(item.status ?? 'present'),
    notes: String(item.notes ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    class_id: Number(values.class_id),
    attendance_date: values.attendance_date,
    status: values.status,
    notes: values.notes.trim(),
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'present') return <span className="inline-status inline-status--active">Present</span>
  if (normalized === 'sick' || normalized === 'excused') return <span className="inline-status inline-status--soft">{String(value)}</span>
  if (normalized === 'late') return <span className="inline-status inline-status--male">Late</span>
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function AttendancesPage() {
  const [items, setItems] = useState<AttendanceRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AttendanceRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [classOptions, setClassOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AttendanceRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (classFilter) query.class_id = Number(classFilter)
    if (statusFilter !== 'all') query.status = statusFilter
    if (attendanceDateFilter) query.attendance_date = attendanceDateFilter
    return query
  }, [studentFilter, classFilter, statusFilter, attendanceDateFilter])

  const presentCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'present').length,
    [overviewItems],
  )
  const dateCoverage = useMemo(
    () => new Set(overviewItems.map((item) => normalizeDateInput(item.attendance_date)).filter(Boolean)).size,
    [overviewItems],
  )

  async function fetchAttendances(searchValue: string, query: Record<string, number | string>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<AttendanceRecord>(endpoint, searchValue, query),
      listResource<AttendanceRecord>(endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchAttendances(deferredSearch, filterQuery)
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
    async function syncAttendances() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchAttendances(deferredSearch, filterQuery)
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
    void syncAttendances()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const [students, classes] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/master/classes'),
        ])
        if (!isMounted) return
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
            value: String(item.id ?? ''),
          })),
        )
        setClassOptions(
          classes.map((item) => ({
            label: `${String(item.name ?? '-')} · ${String(item.department_code ?? '-')} ${String(item.grade_level_code ?? '-')}`,
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

  function handleEditClick(item: AttendanceRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleDelete(item: AttendanceRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus absensi ${item.student_full_name ?? ''}?`)
    if (!confirmed) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Absensi berhasil dihapus.')
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
        setSuccessMessage('Absensi berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Absensi berhasil dibuat.')
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
          <h1 className="page-header__title">Attendances</h1>
          <p className="page-header__description">
            Catat kehadiran siswa per kelas dan tanggal agar pelaporan kehadiran punya fondasi yang rapi sejak awal.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Absensi
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon"><ClipboardCheck size={18} /></div>
          <p className="stat-card__label">Total Records</p>
          <strong className="stat-card__value">{overviewItems.length}</strong>
          <span className="stat-card__hint">Semua catatan absensi yang tersimpan.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><CalendarDays size={18} /></div>
          <p className="stat-card__label">Present</p>
          <strong className="stat-card__value">{presentCount}</strong>
          <span className="stat-card__hint">Jumlah catatan hadir penuh.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><ClipboardCheck size={18} /></div>
          <p className="stat-card__label">Date Coverage</p>
          <strong className="stat-card__value">{dateCoverage}</strong>
          <span className="stat-card__hint">Hari belajar yang sudah punya data absensi.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><ClipboardCheck size={18} /></div>
          <p className="stat-card__label">Student Coverage</p>
          <strong className="stat-card__value">{new Set(overviewItems.map((item) => String(item.student_full_name ?? '')).filter(Boolean)).size}</strong>
          <span className="stat-card__hint">Jumlah siswa yang sudah tercatat kehadirannya.</span>
        </article>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="toolbar__search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari siswa, NIS, kelas, atau jurusan…" />
          </label>
          <div className="toolbar__filters">
            <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="">Semua siswa</option>
              {studentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Semua kelas</option>
              {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input type="date" value={attendanceDateFilter} onChange={(event) => setAttendanceDateFilter(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="present">Present</option>
              <option value="sick">Sick</option>
              <option value="excused">Excused</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
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
                <th>Kelas</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-empty" colSpan={6}><LoaderCircle className="spin" size={18} />&nbsp;Memuat absensi…</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="table-empty" colSpan={6}>Belum ada absensi yang cocok dengan filter saat ini.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.student_full_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.student_nis ?? 'Tanpa NIS'}</div>
                    </td>
                    <td>
                      <div className="cell-title">{item.class_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.department_code ?? '-'} · {item.grade_level_code ?? '-'}</div>
                    </td>
                    <td>{formatDateLabel(item.attendance_date)}</td>
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
                <h2>{editingItem ? 'Edit Absensi' : 'Tambah Absensi'}</h2>
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
                <span>Kelas</span>
                <select required value={formValues.class_id} onChange={(event) => setFormValues((current) => ({ ...current, class_id: event.target.value }))}>
                  <option value="">Pilih kelas</option>
                  {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Tanggal</span>
                <input required type="date" value={formValues.attendance_date} onChange={(event) => setFormValues((current) => ({ ...current, attendance_date: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select required value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}>
                  <option value="present">Present</option>
                  <option value="sick">Sick</option>
                  <option value="excused">Excused</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </label>
              <label className="form-field form-field--full">
                <span>Catatan</span>
                <textarea rows={4} value={formValues.notes} onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="form-actions">
                <button className="button button--ghost" onClick={() => setModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Absensi'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
