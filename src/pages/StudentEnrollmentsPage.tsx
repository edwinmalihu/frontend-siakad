import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BookUser, CheckCircle2, GraduationCap, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listOptions,
  listResource,
  updateResource,
} from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type StudentEnrollmentRecord = ResourceRecord & {
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
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
  status?: string
}

type FormValues = {
  student_id: string
  class_id: string
  academic_year_id: string
  semester_id: string
  status: string
}

const endpoint = '/student-affairs/enrollments'

function toFormValues(item: StudentEnrollmentRecord | null): FormValues {
  if (!item) {
    return {
      student_id: '',
      class_id: '',
      academic_year_id: '',
      semester_id: '',
      status: 'active',
    }
  }

  return {
    student_id: String(item.student_id ?? ''),
    class_id: String(item.class_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
    status: String(item.status ?? 'active'),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    class_id: Number(values.class_id),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
    status: values.status.trim() || 'active',
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active') {
    return <span className="inline-status inline-status--active">Active</span>
  }
  if (normalized === 'inactive') {
    return <span className="inline-status inline-status--inactive">Inactive</span>
  }
  return <span className="inline-status inline-status--soft">{String(value ?? '-')}</span>
}

export function StudentEnrollmentsPage() {
  const [items, setItems] = useState<StudentEnrollmentRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<StudentEnrollmentRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [classOptions, setClassOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [semesterOptions, setSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentEnrollmentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number | string> = {}

    if (studentFilter) {
      query.student_id = Number(studentFilter)
    }
    if (classFilter) {
      query.class_id = Number(classFilter)
    }
    if (academicYearFilter) {
      query.academic_year_id = Number(academicYearFilter)
    }
    if (semesterFilter) {
      query.semester_id = Number(semesterFilter)
    }
    if (statusFilter !== 'all') {
      query.status = statusFilter
    }

    return query
  }, [studentFilter, classFilter, academicYearFilter, semesterFilter, statusFilter])

  const activeEnrollmentCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
    [overviewItems],
  )

  const studentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.student_full_name ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const classCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => `${String(item.class_name ?? '').trim()}::${String(item.department_code ?? '').trim()}`)
        .filter((item) => item !== '::'),
    ).size
  }, [overviewItems])

  const periodCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => `${String(item.academic_year_name ?? '').trim()}::${String(item.semester_code ?? '').trim()}`)
        .filter((item) => item !== '::'),
    ).size
  }, [overviewItems])

  async function fetchEnrollments(searchValue: string, query: Record<string, number | string>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<StudentEnrollmentRecord>(endpoint, searchValue, query),
      listResource<StudentEnrollmentRecord>(endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchEnrollments(deferredSearch, filterQuery)
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

    async function syncEnrollments() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchEnrollments(deferredSearch, filterQuery)
        if (!isMounted) {
          return
        }

        setItems(listResult.items)
        setOverviewItems(overviewResult.items)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void syncEnrollments()

    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [students, classes, academicYears, semesters] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/master/classes'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
        ])

        if (!isMounted) {
          return
        }

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
        if (!isMounted) {
          return
        }

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

  function handleEditClick(item: StudentEnrollmentRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleModalClose() {
    setModalOpen(false)
  }

  async function handleDelete(item: StudentEnrollmentRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus enrollment ${item.student_full_name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Enrollment siswa berhasil dihapus.')
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
        setSuccessMessage('Enrollment siswa berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Enrollment siswa berhasil dibuat.')
      }

      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const optionsReady =
    studentOptions.length > 0 &&
    classOptions.length > 0 &&
    academicYearOptions.length > 0 &&
    semesterOptions.length > 0

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Student Affairs</p>
          <h1 className="page-header__title">Student Enrollments</h1>
          <p className="page-header__description">
            Tempat untuk mengikat siswa ke kelas aktif per tahun ajaran dan semester, sebelum nanti modul absensi,
            nilai, dan disiplin ikut bergantung ke relasi ini.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Enrollment
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon">
            <BookUser size={18} />
          </div>
          <p className="stat-card__label">Total Enrollments</p>
          <strong className="stat-card__value">{overviewItems.length}</strong>
          <span className="stat-card__hint">Semua ikatan siswa ke periode belajar.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <CheckCircle2 size={18} />
          </div>
          <p className="stat-card__label">Active Enrollments</p>
          <strong className="stat-card__value">{activeEnrollmentCount}</strong>
          <span className="stat-card__hint">Basis aman untuk modul akademik harian.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <GraduationCap size={18} />
          </div>
          <p className="stat-card__label">Student Coverage</p>
          <strong className="stat-card__value">{studentCoverage}</strong>
          <span className="stat-card__hint">Jumlah siswa yang sudah punya riwayat enrollment.</span>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon">
            <BookUser size={18} />
          </div>
          <p className="stat-card__label">Class / Period Coverage</p>
          <strong className="stat-card__value">
            {classCoverage} / {periodCoverage}
          </strong>
          <span className="stat-card__hint">Cakupan kelas dan periode akademik.</span>
        </article>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="toolbar__search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa, NIS, kelas, tahun ajaran, atau semester…"
            />
          </label>

          <div className="toolbar__filters">
            <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="">Semua siswa</option>
              {studentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Semua kelas</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={academicYearFilter} onChange={(event) => setAcademicYearFilter(event.target.value)}>
              <option value="">Semua tahun ajaran</option>
              {academicYearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
              <option value="">Semua semester</option>
              {semesterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                <th>Periode</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    <LoaderCircle className="spin" size={18} />
                    &nbsp;Memuat enrollments…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    Belum ada enrollment yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.student_full_name ?? '-'}</div>
                      <div className="cell-subtitle">{item.student_nis ?? 'Tanpa NIS'}</div>
                    </td>
                    <td>
                      <div className="cell-title">{item.class_name ?? '-'}</div>
                      <div className="cell-subtitle">
                        {item.department_code ?? '-'} · {item.grade_level_code ?? '-'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{item.academic_year_name ?? '-'}</div>
                      <div className="cell-subtitle">
                        {item.semester_code ?? '-'} · {item.semester_name ?? '-'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={item.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditClick(item)} type="button">
                          <PencilLine size={16} />
                        </button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDelete(item)} type="button">
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
        <div className="modal-backdrop" onClick={handleModalClose} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-card__header">
              <div>
                <p className="page-header__eyebrow">Student Affairs Form</p>
                <h2>{editingItem ? 'Edit Enrollment' : 'Tambah Enrollment'}</h2>
              </div>
              <button className="icon-button" onClick={handleModalClose} type="button">
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Siswa</span>
                <select
                  required
                  value={formValues.student_id}
                  onChange={(event) => setFormValues((current) => ({ ...current, student_id: event.target.value }))}
                >
                  <option value="">{optionsReady ? 'Pilih siswa' : 'Memuat siswa…'}</option>
                  {studentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Kelas</span>
                <select
                  required
                  value={formValues.class_id}
                  onChange={(event) => setFormValues((current) => ({ ...current, class_id: event.target.value }))}
                >
                  <option value="">{optionsReady ? 'Pilih kelas' : 'Memuat kelas…'}</option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Tahun Ajaran</span>
                <select
                  required
                  value={formValues.academic_year_id}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, academic_year_id: event.target.value }))
                  }
                >
                  <option value="">{optionsReady ? 'Pilih tahun ajaran' : 'Memuat tahun ajaran…'}</option>
                  {academicYearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Semester</span>
                <select
                  required
                  value={formValues.semester_id}
                  onChange={(event) => setFormValues((current) => ({ ...current, semester_id: event.target.value }))}
                >
                  <option value="">{optionsReady ? 'Pilih semester' : 'Memuat semester…'}</option>
                  {semesterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Status</span>
                <select
                  required
                  value={formValues.status}
                  onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="form-actions">
                <button className="button button--ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
