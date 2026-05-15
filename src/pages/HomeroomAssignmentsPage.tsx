import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, GraduationCap, LayoutList, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listOptions,
  listResource,
  updateResource,
} from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type HomeroomAssignmentRecord = ResourceRecord & {
  id?: number
  teacher_id?: number
  teacher_nip?: string
  teacher_full_name?: string
  class_id?: number
  class_name?: string
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
}

type FormValues = {
  teacher_id: string
  class_id: string
  academic_year_id: string
  semester_id: string
}

const config = resourceConfigs.homeroomAssignments

function toFormValues(item: HomeroomAssignmentRecord | null): FormValues {
  if (!item) {
    return {
      teacher_id: '',
      class_id: '',
      academic_year_id: '',
      semester_id: '',
    }
  }

  return {
    teacher_id: String(item.teacher_id ?? ''),
    class_id: String(item.class_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    teacher_id: Number(values.teacher_id),
    class_id: Number(values.class_id),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
  }
}

export function HomeroomAssignmentsPage() {
  const [items, setItems] = useState<HomeroomAssignmentRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<HomeroomAssignmentRecord[]>([])
  const [teacherOptions, setTeacherOptions] = useState<StaticOption[]>([])
  const [classOptions, setClassOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [semesterOptions, setSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeroomAssignmentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}

    if (teacherFilter) {
      query.teacher_id = Number(teacherFilter)
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

    return query
  }, [teacherFilter, classFilter, academicYearFilter, semesterFilter])

  const teacherCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.teacher_full_name ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const classCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.class_name ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const periodCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => `${String(item.academic_year_name ?? '').trim()}::${String(item.semester_code ?? '').trim()}`)
        .filter((item) => item !== '::'),
    ).size
  }, [overviewItems])

  async function fetchAssignments(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<HomeroomAssignmentRecord>(config.endpoint, searchValue, query),
      listResource<HomeroomAssignmentRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchAssignments(deferredSearch, filterQuery)
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

    async function syncAssignments() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchAssignments(deferredSearch, filterQuery)
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

    void syncAssignments()

    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [teachers, classes, academicYears, semesters] = await Promise.all([
          listOptions('/academic/teachers'),
          listOptions('/master/classes'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
        ])

        if (!isMounted) {
          return
        }

        setTeacherOptions(
          teachers.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nip ?? 'Tanpa NIP')}`,
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

  function handleEditClick(item: HomeroomAssignmentRecord) {
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

  async function handleDelete(item: HomeroomAssignmentRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus penugasan wali kelas untuk ${item.class_name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Penugasan wali kelas berhasil dihapus.')
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
        await updateResource(config.endpoint, Number(editingItem.id), payload)
        setSuccessMessage('Penugasan wali kelas berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Penugasan wali kelas berhasil dibuat.')
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
    teacherOptions.length > 0 &&
    classOptions.length > 0 &&
    academicYearOptions.length > 0 &&
    semesterOptions.length > 0

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">{config.eyebrow}</p>
          <h1 className="page-header__title">{config.title}</h1>
          <p className="page-header__description">{config.description}</p>
        </div>

        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Wali Kelas
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Assignments</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua penugasan wali kelas yang tersimpan di sistem.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Teacher Coverage</div>
            <div className="stat-card__value">{teacherCoverage}</div>
            <div className="stat-card__copy">Guru yang sudah pernah mendapat penugasan wali kelas.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <LayoutList size={18} />
          </div>
          <div>
            <div className="stat-card__label">Class & Period</div>
            <div className="stat-card__value stat-card__value--compact">{classCoverage} kelas</div>
            <div className="stat-card__copy">{periodCoverage} kombinasi periode akademik sudah terisi.</div>
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              value={search}
            />
          </div>

          <div className="toolbar__filters">
            <select className="toolbar-select" onChange={(event) => setTeacherFilter(event.target.value)} value={teacherFilter}>
              <option value="">Semua Guru</option>
              {teacherOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setClassFilter(event.target.value)} value={classFilter}>
              <option value="">Semua Kelas</option>
              {classOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__filters">
            <select
              className="toolbar-select"
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              value={academicYearFilter}
            >
              <option value="">Semua Tahun Ajaran</option>
              {academicYearOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setSemesterFilter(event.target.value)} value={semesterFilter}>
              <option value="">Semua Semester</option>
              {semesterOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
            <div className="chip">Master siap: {optionsReady ? 'Lengkap' : 'Belum lengkap'}</div>
          </div>
        </div>

        {loading ? (
          <div className="panel__body">
            <div className="loading-line" />
            <div className="loading-line" style={{ marginTop: '14px' }} />
            <div className="loading-line" style={{ marginTop: '14px', width: '76%' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada data untuk {config.title}.</strong>
              Pastikan data guru, kelas, tahun ajaran, dan semester sudah siap, lalu tetapkan wali kelas per periode akademik.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Class</th>
                  <th>Academic Year</th>
                  <th>Semester</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.teacher_full_name ?? '-')}</div>
                      <div className="cell-subtitle">NIP: {String(item.teacher_nip ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.class_name ?? '-')}</div>
                    </td>
                    <td>{String(item.academic_year_name ?? '-')}</td>
                    <td>
                      <div className="cell-title">{String(item.semester_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.semester_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action" onClick={() => handleEditClick(item)} type="button">
                          <PencilLine size={15} />
                        </button>
                        <button
                          className="table-action table-action--danger"
                          onClick={() => handleDelete(item)}
                          type="button"
                        >
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
        <div className="modal-backdrop" onClick={handleModalClose} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Homeroom Assignment' : 'Create Homeroom Assignment'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui penugasan wali kelas untuk periode yang dipilih.'
                  : 'Tetapkan guru sebagai wali kelas berdasarkan kelas, tahun ajaran, dan semester yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="teacher_id">Teacher *</label>
                  <select
                    id="teacher_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, teacher_id: event.target.value }))
                    }
                    required
                    value={formValues.teacher_id}
                  >
                    <option value="">Pilih Teacher</option>
                    {teacherOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="class_id">Class *</label>
                  <select
                    id="class_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, class_id: event.target.value }))}
                    required
                    value={formValues.class_id}
                  >
                    <option value="">Pilih Class</option>
                    {classOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="academic_year_id">Academic Year *</label>
                  <select
                    id="academic_year_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, academic_year_id: event.target.value }))
                    }
                    required
                    value={formValues.academic_year_id}
                  >
                    <option value="">Pilih Academic Year</option>
                    {academicYearOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="semester_id">Semester *</label>
                  <select
                    id="semester_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, semester_id: event.target.value }))
                    }
                    required
                    value={formValues.semester_id}
                  >
                    <option value="">Pilih Semester</option>
                    {semesterOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {!optionsReady ? <small>Lengkapi `Teachers`, `Classes`, `Academic Years`, dan `Semesters` terlebih dahulu.</small> : null}
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
