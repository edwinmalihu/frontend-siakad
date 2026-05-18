import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, CalendarRange, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type StudentMutationRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
  mutation_type?: string
  from_school?: string
  to_school?: string
  reason?: string
  effective_date?: string
  status?: string
}

type FormValues = {
  student_id: string
  academic_year_id: string
  semester_id: string
  mutation_type: string
  from_school: string
  to_school: string
  reason: string
  effective_date: string
  status: string
}

const endpoint = '/student-affairs/mutations'
const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return ''
  }
  return value.slice(0, 10)
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return formatter.format(date)
}

function toFormValues(item: StudentMutationRecord | null): FormValues {
  if (!item) {
    return {
      student_id: '',
      academic_year_id: '',
      semester_id: '',
      mutation_type: 'transfer_out',
      from_school: '',
      to_school: '',
      reason: '',
      effective_date: '',
      status: 'pending',
    }
  }

  return {
    student_id: String(item.student_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
    mutation_type: String(item.mutation_type ?? 'transfer_out'),
    from_school: String(item.from_school ?? ''),
    to_school: String(item.to_school ?? ''),
    reason: String(item.reason ?? ''),
    effective_date: normalizeDateInput(item.effective_date),
    status: String(item.status ?? 'pending'),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
    mutation_type: values.mutation_type,
    from_school: values.from_school.trim(),
    to_school: values.to_school.trim(),
    reason: values.reason.trim(),
    effective_date: values.effective_date,
    status: values.status,
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'approved' || normalized === 'completed') {
    return <span className="inline-status inline-status--active">{String(value)}</span>
  }
  if (normalized === 'pending') {
    return <span className="inline-status inline-status--soft">Pending</span>
  }
  if (normalized === 'rejected') {
    return <span className="inline-status inline-status--inactive">Rejected</span>
  }
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function StudentMutationsPage() {
  const [items, setItems] = useState<StudentMutationRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<StudentMutationRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [semesterOptions, setSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [mutationTypeFilter, setMutationTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentMutationRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (semesterFilter) query.semester_id = Number(semesterFilter)
    if (mutationTypeFilter !== 'all') query.mutation_type = mutationTypeFilter
    if (statusFilter !== 'all') query.status = statusFilter
    return query
  }, [studentFilter, academicYearFilter, semesterFilter, mutationTypeFilter, statusFilter])

  const pendingCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'pending').length,
    [overviewItems],
  )
  const typeCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.mutation_type ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const studentCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.student_full_name ?? '')).filter(Boolean)).size,
    [overviewItems],
  )

  async function fetchMutations(searchValue: string, query: Record<string, number | string>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<StudentMutationRecord>(endpoint, searchValue, query),
      listResource<StudentMutationRecord>(endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchMutations(deferredSearch, filterQuery)
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
    async function syncMutations() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchMutations(deferredSearch, filterQuery)
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
    void syncMutations()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const [students, academicYears, semesters] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
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
        setSemesterOptions(
          semesters.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
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

  function handleEditClick(item: StudentMutationRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleDelete(item: StudentMutationRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus mutasi untuk ${item.student_full_name ?? ''}?`)
    if (!confirmed) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Mutasi siswa berhasil dihapus.')
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
        setSuccessMessage('Mutasi siswa berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Mutasi siswa berhasil dibuat.')
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
          <h1 className="page-header__title">Student Mutations</h1>
          <p className="page-header__description">
            Catat perpindahan, keluar, atau status mutasi siswa per periode akademik supaya riwayat siswa tetap utuh.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Mutasi
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon"><ArrowRightLeft size={18} /></div>
          <p className="stat-card__label">Total Mutations</p>
          <strong className="stat-card__value">{overviewItems.length}</strong>
          <span className="stat-card__hint">Semua riwayat mutasi yang tercatat.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><CalendarRange size={18} /></div>
          <p className="stat-card__label">Pending</p>
          <strong className="stat-card__value">{pendingCount}</strong>
          <span className="stat-card__hint">Mutasi yang belum selesai diproses.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><ArrowRightLeft size={18} /></div>
          <p className="stat-card__label">Type Coverage</p>
          <strong className="stat-card__value">{typeCoverage}</strong>
          <span className="stat-card__hint">Ragam jenis mutasi yang aktif dipakai.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon"><ArrowRightLeft size={18} /></div>
          <p className="stat-card__label">Student Coverage</p>
          <strong className="stat-card__value">{studentCoverage}</strong>
          <span className="stat-card__hint">Jumlah siswa yang punya riwayat mutasi.</span>
        </article>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="toolbar__search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa, NIS, sekolah asal/tujuan, atau periode…"
            />
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
            <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
              <option value="">Semua semester</option>
              {semesterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={mutationTypeFilter} onChange={(event) => setMutationTypeFilter(event.target.value)}>
              <option value="all">Semua tipe</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="dropout">Dropout</option>
              <option value="other">Other</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
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
                <th>Periode</th>
                <th>Tipe</th>
                <th>Sekolah</th>
                <th>Tanggal Efektif</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-empty" colSpan={7}><LoaderCircle className="spin" size={18} />&nbsp;Memuat mutasi…</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="table-empty" colSpan={7}>Belum ada mutasi yang cocok dengan filter saat ini.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.student_full_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.student_nis ?? 'Tanpa NIS'}</div>
                    </td>
                    <td>
                      <div className="cell-title">{item.academic_year_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.semester_code ?? '-'} · {item.semester_name ?? '-'}</div>
                    </td>
                    <td><span className="inline-status inline-status--soft">{String(item.mutation_type ?? '-')}</span></td>
                    <td>
                      <div className="cell-title">{item.from_school ?? '-'}</div>
                      <div className="cell-subtitle">{item.to_school ?? '-'}</div>
                    </td>
                    <td>{formatDateLabel(item.effective_date)}</td>
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
        <div className="modal-backdrop" onClick={() => setModalOpen(false)} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-card__header">
              <div>
                <p className="page-header__eyebrow">Student Affairs Form</p>
                <h2>{editingItem ? 'Edit Mutasi' : 'Tambah Mutasi'}</h2>
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
                <span>Semester</span>
                <select required value={formValues.semester_id} onChange={(event) => setFormValues((current) => ({ ...current, semester_id: event.target.value }))}>
                  <option value="">Pilih semester</option>
                  {semesterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Tipe Mutasi</span>
                <select required value={formValues.mutation_type} onChange={(event) => setFormValues((current) => ({ ...current, mutation_type: event.target.value }))}>
                  <option value="transfer_in">Transfer In</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="dropout">Dropout</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="form-field">
                <span>Sekolah Asal</span>
                <input value={formValues.from_school} onChange={(event) => setFormValues((current) => ({ ...current, from_school: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Sekolah Tujuan</span>
                <input value={formValues.to_school} onChange={(event) => setFormValues((current) => ({ ...current, to_school: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Tanggal Efektif</span>
                <input type="date" value={formValues.effective_date} onChange={(event) => setFormValues((current) => ({ ...current, effective_date: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select required value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="form-field form-field--full">
                <span>Alasan</span>
                <textarea rows={4} value={formValues.reason} onChange={(event) => setFormValues((current) => ({ ...current, reason: event.target.value }))} />
              </label>
              <div className="form-actions">
                <button className="button button--ghost" onClick={() => setModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Mutasi'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
