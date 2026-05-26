import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, GraduationCap, Users2, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
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

type StudentAssessmentRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_name?: string
  student_nis?: string
  class_id?: number
  class_name?: string
  subject_id?: number
  subject_code?: string
  subject_name?: string
  assessment_component_id?: number
  component_name?: string
  component_weight?: number
  teacher_id?: number
  teacher_name?: string
  score?: number
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
}

type FormValues = {
  student_id: string
  class_id: string
  subject_id: string
  assessment_component_id: string
  teacher_id: string
  score: string
  academic_year_id: string
  semester_id: string
}

const config = resourceConfigs.studentAssessments

function toFormValues(item: StudentAssessmentRecord | null): FormValues {
  if (!item) {
    return {
      student_id: '',
      class_id: '',
      subject_id: '',
      assessment_component_id: '',
      teacher_id: '',
      score: '',
      academic_year_id: '',
      semester_id: '',
    }
  }

  return {
    student_id: String(item.student_id ?? ''),
    class_id: String(item.class_id ?? ''),
    subject_id: String(item.subject_id ?? ''),
    assessment_component_id: String(item.assessment_component_id ?? ''),
    teacher_id: String(item.teacher_id ?? ''),
    score: item.score === null || item.score === undefined ? '' : String(item.score),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    student_id: Number(values.student_id),
    class_id: Number(values.class_id),
    subject_id: Number(values.subject_id),
    assessment_component_id: Number(values.assessment_component_id),
    teacher_id: Number(values.teacher_id),
    score: Number(values.score),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
  }
}

export function StudentAssessmentsPage() {
  const [items, setItems] = useState<StudentAssessmentRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<StudentAssessmentRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [classOptions, setClassOptions] = useState<StaticOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<StaticOption[]>([])
  const [teacherOptions, setTeacherOptions] = useState<StaticOption[]>([])
  const [allComponentOptions, setAllComponentOptions] = useState<StaticOption[]>([])
  const [formComponentOptions, setFormComponentOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [allSemesterOptions, setAllSemesterOptions] = useState<StaticOption[]>([])
  const [formSemesterOptions, setFormSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [studentFilter, setStudentFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentAssessmentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (classFilter) query.class_id = Number(classFilter)
    if (subjectFilter) query.subject_id = Number(subjectFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (semesterFilter) query.semester_id = Number(semesterFilter)
    return query
  }, [studentFilter, classFilter, subjectFilter, academicYearFilter, semesterFilter])

  const studentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.student_id ?? ''))
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const componentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.assessment_component_id ?? ''))
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  async function fetchItems(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<StudentAssessmentRecord>(config.endpoint, searchValue, query),
      listResource<StudentAssessmentRecord>(config.endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchItems(deferredSearch, filterQuery)
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

    async function syncItems() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchItems(deferredSearch, filterQuery)
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

    void syncItems()
    return () => { isMounted = false }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [students, classes, subjects, teachers, components, academicYears, semesters] = await Promise.all([
          listOptions('/student-affairs/students'),
          listOptions('/master/classes'),
          listOptions('/academic/subjects'),
          listOptions('/academic/teachers'),
          listOptions('/academic/assessment-components'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
        ])

        if (!isMounted) return

        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.nis ?? '-')} · ${String(item.full_name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
        setClassOptions(
          classes.map((item) => ({
            label: `${String(item.name ?? '-')} · ${String(item.department_code ?? '')} ${String(item.grade_level_code ?? '')}`,
            value: String(item.id ?? ''),
          })),
        )
        setSubjectOptions(
          subjects.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
        setTeacherOptions(
          teachers.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nip ?? '')}`,
            value: String(item.id ?? ''),
          })),
        )
        setAllComponentOptions(
          components.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
            subject_id: item.subject_id,
            semester_id: item.semester_id,
            weight: item.weight,
          })),
        )
        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setAllSemesterOptions(
          semesters.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
            academic_year_id: item.academic_year_id,
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }

    void syncOptions()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!formValues.academic_year_id) {
      setFormSemesterOptions([])
      return
    }
    setFormSemesterOptions(
      allSemesterOptions.filter(
        (opt) => String(opt.academic_year_id ?? '') === formValues.academic_year_id,
      ),
    )
  }, [formValues.academic_year_id, allSemesterOptions])

  useEffect(() => {
    if (!formValues.subject_id || !formValues.semester_id) {
      setFormComponentOptions([])
      return
    }
    setFormComponentOptions(
      allComponentOptions.filter(
        (opt) =>
          String(opt.subject_id ?? '') === formValues.subject_id &&
          String(opt.semester_id ?? '') === formValues.semester_id,
      ),
    )
  }, [formValues.subject_id, formValues.semester_id, allComponentOptions])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: StudentAssessmentRecord) {
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

  async function handleDelete(item: StudentAssessmentRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus penilaian siswa "${item.student_name ?? ''}"?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Penilaian siswa berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  function handleFormChange(field: string, value: string) {
    setFormValues((current) => {
      const next = { ...current, [field]: value }
      if (field === 'academic_year_id') {
        next.semester_id = ''
        next.assessment_component_id = ''
      }
      if (field === 'semester_id') {
        next.assessment_component_id = ''
      }
      if (field === 'subject_id') {
        next.assessment_component_id = ''
      }
      return next
    })
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
        setSuccessMessage('Penilaian siswa berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Penilaian siswa berhasil dibuat.')
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
    subjectOptions.length > 0 &&
    teacherOptions.length > 0 &&
    academicYearOptions.length > 0

  function formatScore(score: number | undefined | null) {
    if (score === null || score === undefined) return '-'
    return String(score)
  }

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
            &nbsp;Tambah Penilaian
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Records</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Data penilaian siswa yang terdaftar di seluruh komponen.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Student Coverage</div>
            <div className="stat-card__value">{studentCoverage}</div>
            <div className="stat-card__copy">Siswa yang sudah memiliki data penilaian.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Component Coverage</div>
            <div className="stat-card__value">{componentCoverage}</div>
            <div className="stat-card__copy">Komponen penilaian yang sudah terisi nilai.</div>
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
            <select
              className="toolbar-select"
              onChange={(event) => setStudentFilter(event.target.value)}
              value={studentFilter}
            >
              <option value="">Semua Siswa</option>
              {studentOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setClassFilter(event.target.value)}
              value={classFilter}
            >
              <option value="">Semua Kelas</option>
              {classOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setSubjectFilter(event.target.value)}
              value={subjectFilter}
            >
              <option value="">Semua Mapel</option>
              {subjectOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              value={academicYearFilter}
            >
              <option value="">Semua Tahun</option>
              {academicYearOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setSemesterFilter(event.target.value)}
              value={semesterFilter}
            >
              <option value="">Semua Semester</option>
              {allSemesterOptions.map((option) => (
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
              <strong>Belum ada data penilaian siswa.</strong>
              Isi komponen penilaian terlebih dahulu, lalu masukkan nilai per siswa untuk setiap mapel.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Component</th>
                  <th>Teacher</th>
                  <th>Score</th>
                  <th>Period</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.student_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.student_nis ?? '')}</div>
                    </td>
                    <td>{String(item.class_name ?? '-')}</td>
                    <td>
                      <div className="cell-title">{String(item.subject_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.component_name ?? '-')}</div>
                      <div className="cell-subtitle">{item.component_weight ? `${item.component_weight}%` : ''}</div>
                    </td>
                    <td>{String(item.teacher_name ?? '-')}</td>
                    <td>
                      <span className="inline-status inline-status--soft">{formatScore(item.score)}</span>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
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
              <h2 className="modal-title">{editingItem ? 'Edit Penilaian' : 'Tambah Penilaian'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui data penilaian siswa tanpa keluar dari konteks akademik.'
                  : 'Masukkan nilai siswa untuk komponen penilaian tertentu pada mapel dan periode yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="student_id">Siswa *</label>
                  <select
                    id="student_id"
                    onChange={(event) => handleFormChange('student_id', event.target.value)}
                    required
                    value={formValues.student_id}
                  >
                    <option value="">Pilih Siswa</option>
                    {studentOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="class_id">Kelas *</label>
                  <select
                    id="class_id"
                    onChange={(event) => handleFormChange('class_id', event.target.value)}
                    required
                    value={formValues.class_id}
                  >
                    <option value="">Pilih Kelas</option>
                    {classOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="academic_year_id">Tahun Ajaran *</label>
                  <select
                    id="academic_year_id"
                    onChange={(event) => handleFormChange('academic_year_id', event.target.value)}
                    required
                    value={formValues.academic_year_id}
                  >
                    <option value="">Pilih Tahun Ajaran</option>
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
                    onChange={(event) => handleFormChange('semester_id', event.target.value)}
                    required
                    value={formValues.semester_id}
                    disabled={!formValues.academic_year_id}
                  >
                    <option value="">
                      {formValues.academic_year_id ? 'Pilih Semester' : 'Pilih tahun ajaran terlebih dahulu'}
                    </option>
                    {formSemesterOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="subject_id">Mata Pelajaran *</label>
                  <select
                    id="subject_id"
                    onChange={(event) => handleFormChange('subject_id', event.target.value)}
                    required
                    value={formValues.subject_id}
                  >
                    <option value="">Pilih Mapel</option>
                    {subjectOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="teacher_id">Guru *</label>
                  <select
                    id="teacher_id"
                    onChange={(event) => handleFormChange('teacher_id', event.target.value)}
                    required
                    value={formValues.teacher_id}
                  >
                    <option value="">Pilih Guru</option>
                    {teacherOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="assessment_component_id">Komponen *</label>
                  <select
                    id="assessment_component_id"
                    onChange={(event) => handleFormChange('assessment_component_id', event.target.value)}
                    required
                    value={formValues.assessment_component_id}
                    disabled={!formValues.subject_id || !formValues.semester_id}
                  >
                    <option value="">
                      {formValues.subject_id && formValues.semester_id
                        ? 'Pilih Komponen'
                        : 'Pilih mapel & semester terlebih dahulu'}
                    </option>
                    {formComponentOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="score">Nilai *</label>
                  <input
                    id="score"
                    max={100}
                    min={0}
                    onChange={(event) => handleFormChange('score', event.target.value)}
                    placeholder="85"
                    required
                    step="0.01"
                    type="number"
                    value={formValues.score}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Penilaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
